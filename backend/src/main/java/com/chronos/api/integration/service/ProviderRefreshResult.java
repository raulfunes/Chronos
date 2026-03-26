package com.chronos.api.integration.service;

import java.time.Instant;
import java.util.Map;

public record ProviderRefreshResult(
    String accessToken,
    Instant expiresAt,
    Map<String, Object> credentials
) {
}
