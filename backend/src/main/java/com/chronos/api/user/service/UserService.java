package com.chronos.api.user.service;

import com.chronos.api.common.dto.AuthResponse;
import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.common.security.AuthenticatedUser;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.model.UserRole;
import com.chronos.api.user.repository.AppUserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final AppUserRepository appUserRepository;

    public UserService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    public AuthResponse me(AuthenticatedUser authenticatedUser) {
        if (authenticatedUser.getRole() == UserRole.GUEST) {
            return new AuthResponse(null, -1L, authenticatedUser.getUsername(), "Guest", UserRole.GUEST);
        }

        AppUser user = appUserRepository.findById(authenticatedUser.getUserId())
            .orElseThrow(() -> new NotFoundException("User not found"));
        return new AuthResponse(null, user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
    }
}
