package com.chronos.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank String displayName,
    @Email @NotBlank String email,
    @Size(min = 8) String password
) {
}
