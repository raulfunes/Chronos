package com.chronos.api.auth.controller;

import com.chronos.api.auth.dto.LoginRequest;
import com.chronos.api.auth.dto.RegisterRequest;
import com.chronos.api.auth.service.AuthService;
import com.chronos.api.common.dto.AuthResponse;
import com.chronos.api.common.security.AuthenticatedUser;
import com.chronos.api.common.security.CurrentUser;
import com.chronos.api.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final CurrentUser currentUser;

    public AuthController(AuthService authService, UserService userService, CurrentUser currentUser) {
        this.authService = authService;
        this.userService = userService;
        this.currentUser = currentUser;
    }

    @PostMapping("/auth/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/auth/guest")
    public AuthResponse guest() {
        return authService.guest();
    }

    @GetMapping("/me")
    public AuthResponse me() {
        AuthenticatedUser user = currentUser.require();
        return userService.me(user);
    }
}
