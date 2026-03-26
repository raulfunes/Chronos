package com.chronos.api.integration.service;

import com.chronos.api.integration.model.IntegrationAuthType;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ProviderConnectionResult(
    String providerAccountId,
    String displayName,
    IntegrationAuthType authType,
    List<String> scopes,
    Map<String, Object> credentials,
    Map<String, Object> config,
    Instant tokenExpiresAt
) {
}
