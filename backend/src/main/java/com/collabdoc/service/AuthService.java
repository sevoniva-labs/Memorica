package com.collabdoc.service;

import com.collabdoc.dto.*;
import com.collabdoc.entity.User;
import com.collabdoc.repository.UserRepository;
import com.collabdoc.security.JwtUtil;
import com.collabdoc.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    private static final String[] COLORS = {
        "#ef4444", "#f97316", "#eab308", "#22c55e",
        "#3b82f6", "#a855f7", "#ec4899", "#6b7280"
    };

    public ApiResponse<?> register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ApiResponse.error("邮箱已被注册");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            return ApiResponse.error("用户名已被使用");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName() != null ? request.getDisplayName() : request.getUsername())
                .color(request.getColor() != null ? request.getColor() : randomColor())
                .build();

        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getUsername());

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
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getUsername());

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
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ApiResponse.error("用户不存在");
        return ApiResponse.success(Map.of(
            "id", user.getId(),
            "username", user.getUsername(),
            "email", user.getEmail(),
            "displayName", user.getDisplayName(),
            "color", user.getColor()
        ));
    }

    private String randomColor() {
        return COLORS[new Random().nextInt(COLORS.length)];
    }
}
