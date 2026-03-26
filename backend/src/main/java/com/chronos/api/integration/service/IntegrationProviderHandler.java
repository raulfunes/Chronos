package com.chronos.api.integration.service;

import com.chronos.api.integration.model.IntegrationAccount;
import com.chronos.api.integration.model.IntegrationProvider;
import java.util.Map;

public interface IntegrationProviderHandler {

    IntegrationProvider provider();

    String buildAuthorizationUrl(String state);

    ProviderConnectionResult completeAuthorization(String code);

    ProviderRefreshResult refreshAccessToken(IntegrationAccount integrationAccount, Map<String, Object> credentials);
}
