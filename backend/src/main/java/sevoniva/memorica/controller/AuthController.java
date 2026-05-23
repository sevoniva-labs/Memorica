package sevoniva.memorica.controller;

import sevoniva.memorica.dto.*;
import sevoniva.memorica.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ApiResponse<?> register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ApiResponse<?> login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public ApiResponse<?> me() {
        Long userId = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
        return authService.me(userId);
    }
}
