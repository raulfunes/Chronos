package com.chronos.api.auth.service;

import com.chronos.api.auth.dto.LoginRequest;
import com.chronos.api.auth.dto.RegisterRequest;
import com.chronos.api.common.dto.AuthResponse;
import com.chronos.api.common.exception.BadRequestException;
import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.common.security.JwtService;
import com.chronos.api.settings.model.UserSettings;
import com.chronos.api.settings.repository.UserSettingsRepository;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.model.UserRole;
import com.chronos.api.user.repository.AppUserRepository;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AppUserRepository appUserRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
        AppUserRepository appUserRepository,
        UserSettingsRepository userSettingsRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService
    ) {
        this.appUserRepository = appUserRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (appUserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new BadRequestException("Email already registered");
        }

        AppUser user = new AppUser();
        user.setDisplayName(request.displayName());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.USER);
        AppUser savedUser = appUserRepository.save(user);

        UserSettings settings = new UserSettings();
        settings.setUser(savedUser);
        userSettingsRepository.save(settings);
        log.info("Registered user userId={} email={} role={}", savedUser.getId(), savedUser.getEmail(), savedUser.getRole());

        return buildResponse(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        AppUser user = appUserRepository.findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new NotFoundException("User not found"));
        log.info("Login successful userId={} email={} role={}", user.getId(), user.getEmail(), user.getRole());
        return buildResponse(user);
    }

    public AuthResponse guest() {
        String token = jwtService.generateToken("guest", Map.of("role", UserRole.GUEST.name()));
        log.info("Issued guest token role={}", UserRole.GUEST);
        return new AuthResponse(token, -1L, "guest@chronos.local", "Guest", UserRole.GUEST);
    }

    private AuthResponse buildResponse(AppUser user) {
        String token = jwtService.generateToken(
            user.getEmail(),
            Map.of("role", user.getRole().name(), "userId", user.getId())
        );
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
    }
}
