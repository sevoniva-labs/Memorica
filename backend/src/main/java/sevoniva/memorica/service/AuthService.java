package sevoniva.memorica.service;

import sevoniva.memorica.dto.*;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.BadRequestException;
import sevoniva.memorica.exception.ResourceNotFoundException;
import sevoniva.memorica.repository.UserRepository;
import sevoniva.memorica.security.JwtUtil;
import sevoniva.memorica.security.UserDetailsImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtUtil jwtUtil,
                       @org.springframework.beans.factory.annotation.Autowired(required = false) TokenBlacklistService tokenBlacklistService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    private static final String[] COLORS = {
        "#ef4444", "#f97316", "#eab308", "#22c55e",
        "#3b82f6", "#a855f7", "#ec4899", "#6b7280"
    };

    public ApiResponse<?> register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("邮箱已被注册");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("用户名已被使用");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName() != null ? request.getDisplayName() : request.getUsername())
                .color(request.getColor() != null ? request.getColor() : randomColor())
                .build();

        userRepository.save(user);
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getUsername());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail(), user.getUsername());

        return ApiResponse.success(Map.of(
            "accessToken", accessToken,
            "refreshToken", refreshToken,
            "user", userMap(user)
        ));
    }

    public ApiResponse<?> login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getUsername());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail(), user.getUsername());

        return ApiResponse.success(Map.of(
            "accessToken", accessToken,
            "refreshToken", refreshToken,
            "user", userMap(user)
        ));
    }

    public ApiResponse<?> refreshToken(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken) || !jwtUtil.isRefreshToken(refreshToken)) {
            throw new BadRequestException("Refresh token 无效或已过期");
        }
        if (tokenBlacklistService != null && tokenBlacklistService.isBlacklisted(refreshToken)) {
            throw new BadRequestException("Refresh token 已被撤销");
        }

        Long userId = jwtUtil.getUserIdFromToken(refreshToken);
        String email = jwtUtil.getEmailFromToken(refreshToken);
        String username = jwtUtil.getUsernameFromToken(refreshToken);

        long oldExpiration = jwtUtil.getTokenExpiration(refreshToken);
        if (tokenBlacklistService != null) {
            tokenBlacklistService.blacklist(refreshToken, oldExpiration);
        }

        String newAccessToken = jwtUtil.generateAccessToken(userId, email, username);
        String newRefreshToken = jwtUtil.generateRefreshToken(userId, email, username);

        return ApiResponse.success(Map.of(
            "accessToken", newAccessToken,
            "refreshToken", newRefreshToken
        ));
    }

    public ApiResponse<?> logout(String token) {
        if (tokenBlacklistService != null) {
            long expiration = jwtUtil.getTokenExpiration(token);
            tokenBlacklistService.blacklist(token, expiration);
        }
        return ApiResponse.success(null);
    }

    public ApiResponse<?> me(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        return ApiResponse.success(userMap(user));
    }

    private Map<String, Object> userMap(User user) {
        var map = new java.util.HashMap<String, Object>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("displayName", user.getDisplayName());
        map.put("color", user.getColor());
        return map;
    }

    private String randomColor() {
        return COLORS[ThreadLocalRandom.current().nextInt(COLORS.length)];
    }
}
