package sevoniva.memorica.service;

import sevoniva.memorica.dto.LoginRequest;
import sevoniva.memorica.dto.RegisterRequest;
import sevoniva.memorica.entity.User;
import sevoniva.memorica.exception.BadRequestException;
import sevoniva.memorica.repository.UserRepository;
import sevoniva.memorica.security.JwtUtil;
import sevoniva.memorica.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    @Mock
    private AuditService auditService;
    @Mock
    private WorkspaceService workspaceService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder,
                authenticationManager, jwtUtil, tokenBlacklistService, auditService, workspaceService);
    }

    @Test
    void register_shouldSucceedWithValidInput() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("testuser");
        req.setEmail("test@example.com");
        req.setPassword("Password1");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(passwordEncoder.encode("Password1")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtUtil.generateAccessToken(eq(1L), eq("test@example.com"), eq("testuser")))
                .thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(eq(1L), eq("test@example.com"), eq("testuser")))
                .thenReturn("refresh-token");

        var result = authService.register(req);
        assertNotNull(result.getData());
        verify(userRepository).save(any(User.class));
        verify(workspaceService).ensurePersonalWorkspace(any(User.class));
    }

    @Test
    void register_shouldFailOnDuplicateEmail() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("testuser");
        req.setEmail("test@example.com");
        req.setPassword("Password1");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_shouldReturnTokensOnSuccess() {
        LoginRequest req = new LoginRequest();
        req.setUsername("testuser");
        req.setPassword("Password1");

        User user = User.builder()
                .id(1L).username("testuser").email("test@example.com")
                .password("hashed").color("#ef4444")
                .build();
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(userDetails);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(auth);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(jwtUtil.generateAccessToken(1L, "test@example.com", "testuser"))
                .thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(1L, "test@example.com", "testuser"))
                .thenReturn("refresh-token");

        var result = authService.login(req);
        assertNotNull(result.getData());
        verify(auditService).log(eq(1L), eq("testuser"), eq("AUTH_LOGIN"),
                eq("USER"), eq("1"), eq("User logged in"), isNull());
    }

    @Test
    void refreshToken_shouldRotateAndBlacklistOldToken() {
        when(jwtUtil.validateToken("old-refresh-token")).thenReturn(true);
        when(jwtUtil.isRefreshToken("old-refresh-token")).thenReturn(true);
        when(tokenBlacklistService.isBlacklisted("old-refresh-token")).thenReturn(false);
        when(jwtUtil.getUserIdFromToken("old-refresh-token")).thenReturn(1L);
        when(jwtUtil.getEmailFromToken("old-refresh-token")).thenReturn("test@example.com");
        when(jwtUtil.getUsernameFromToken("old-refresh-token")).thenReturn("testuser");
        when(jwtUtil.getTokenExpiration("old-refresh-token")).thenReturn(1_800_000L);
        when(jwtUtil.generateAccessToken(1L, "test@example.com", "testuser"))
                .thenReturn("new-access-token");
        when(jwtUtil.generateRefreshToken(1L, "test@example.com", "testuser"))
                .thenReturn("new-refresh-token");

        var result = authService.refreshToken("old-refresh-token");

        assertNotNull(result.getData());
        verify(tokenBlacklistService).blacklist("old-refresh-token", 1_800_000L);
        verify(auditService).log(eq(1L), eq("testuser"), eq("AUTH_REFRESH"),
                eq("USER"), eq("1"), eq("Refresh token rotated"), isNull());
    }

    @Test
    void refreshToken_shouldRejectBlacklistedTokenWithoutRotating() {
        when(jwtUtil.validateToken("old-refresh-token")).thenReturn(true);
        when(jwtUtil.isRefreshToken("old-refresh-token")).thenReturn(true);
        when(tokenBlacklistService.isBlacklisted("old-refresh-token")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.refreshToken("old-refresh-token"));

        verify(tokenBlacklistService, never()).blacklist(anyString(), anyLong());
        verify(jwtUtil, never()).generateAccessToken(anyLong(), anyString(), anyString());
        verify(jwtUtil, never()).generateRefreshToken(anyLong(), anyString(), anyString());
        verify(auditService, never()).log(anyLong(), anyString(), eq("AUTH_REFRESH"),
                anyString(), anyString(), anyString(), any());
    }

    @Test
    void logout_shouldBlacklistAccessTokenAndAudit() {
        when(jwtUtil.getUserIdFromToken("access-token")).thenReturn(1L);
        when(jwtUtil.getUsernameFromToken("access-token")).thenReturn("testuser");
        when(jwtUtil.getTokenExpiration("access-token")).thenReturn(900_000L);

        var result = authService.logout("access-token");

        assertNull(result.getData());
        verify(tokenBlacklistService).blacklist("access-token", 900_000L);
        verify(auditService).log(eq(1L), eq("testuser"), eq("AUTH_LOGOUT"),
                eq("USER"), eq("1"), eq("Access token revoked"), isNull());
    }
}
