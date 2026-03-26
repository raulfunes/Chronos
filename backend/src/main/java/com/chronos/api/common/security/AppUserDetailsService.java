package com.chronos.api.common.security;

import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.user.repository.AppUserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public AppUserDetailsService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        return appUserRepository.findByEmailIgnoreCase(username)
            .map(AuthenticatedUser::new)
            .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
