package com.chronos.api.integration.dto;

import com.chronos.api.integration.model.IntegrationProvider;

public record IntegrationConnectStartResponse(
    IntegrationProvider provider,
    String redirectUrl
) {
}
