package com.chronos.api.common.dto;

import com.chronos.api.user.model.UserRole;

public record AuthResponse(
    String token,
    Long userId,
    String email,
    String displayName,
    UserRole role
) {
}
