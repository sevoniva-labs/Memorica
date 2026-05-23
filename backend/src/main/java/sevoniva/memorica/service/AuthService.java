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

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
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
        String token = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getUsername());

        return ApiResponse.success(Map.of(
            "token", token,
            "user", Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "displayName", user.getDisplayName(),
                "color", user.getColor()
            )
        ));
    }

    public ApiResponse<?> login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
        String token = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getUsername());

        return ApiResponse.success(Map.of(
            "token", token,
            "user", Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "displayName", user.getDisplayName(),
                "color", user.getColor()
            )
        ));
    }

    public ApiResponse<?> me(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        return ApiResponse.success(Map.of(
            "id", user.getId(),
            "username", user.getUsername(),
            "email", user.getEmail(),
            "displayName", user.getDisplayName(),
            "color", user.getColor()
        ));
    }

    private String randomColor() {
        return COLORS[ThreadLocalRandom.current().nextInt(COLORS.length)];
    }
}
