package com.chronos.api.common.security;

import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.model.UserRole;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AuthenticatedUser implements UserDetails {

    private final Long userId;
    private final String email;
    private final String password;
    private final UserRole role;

    public AuthenticatedUser(AppUser user) {
        this(user.getId(), user.getEmail(), user.getPasswordHash(), user.getRole());
    }

    public AuthenticatedUser(Long userId, String email, String password, UserRole role) {
        this.userId = userId;
        this.email = email;
        this.password = password;
        this.role = role;
    }

    public Long getUserId() {
        return userId;
    }

    public UserRole getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }
}
