package com.chronos.api.integration.dto;

import java.time.Instant;

public record IntegrationTokenRefreshResponse(
    String accessToken,
    Instant expiresAt
) {
}
