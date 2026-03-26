package com.chronos.api.integration.service;

import com.chronos.api.common.exception.BadRequestException;
import com.chronos.api.integration.config.IntegrationProperties;
import com.chronos.api.integration.model.IntegrationAccount;
import com.chronos.api.integration.model.IntegrationAuthType;
import com.chronos.api.integration.model.IntegrationProvider;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class SpotifyIntegrationProvider implements IntegrationProviderHandler {

    private final IntegrationProperties integrationProperties;
    private final RestClient restClient;

    public SpotifyIntegrationProvider(IntegrationProperties integrationProperties, RestClient.Builder restClientBuilder) {
        this.integrationProperties = integrationProperties;
        this.restClient = restClientBuilder.build();
    }

    @Override
    public IntegrationProvider provider() {
        return IntegrationProvider.SPOTIFY;
    }

    @Override
    public String buildAuthorizationUrl(String state) {
        validateConfiguration();
        return UriComponentsBuilder.fromUriString("https://accounts.spotify.com/authorize")
            .queryParam("client_id", integrationProperties.getSpotify().getClientId())
            .queryParam("response_type", "code")
            .queryParam("redirect_uri", integrationProperties.getSpotify().getRedirectUri())
            .queryParam("scope", String.join(" ", integrationProperties.getSpotify().getScopes()))
            .queryParam("state", state)
            .queryParam("show_dialog", "false")
            .build(true)
            .toUriString();
    }

    @Override
    public ProviderConnectionResult completeAuthorization(String code) {
        validateConfiguration();
        TokenResponse tokenResponse = exchangeCode(code);
        if (tokenResponse == null || tokenResponse.accessToken() == null || tokenResponse.expiresIn() == null) {
            throw new BadRequestException("Spotify token exchange failed");
        }
        SpotifyProfileResponse profile = fetchProfile(tokenResponse.accessToken());
        if (profile == null || profile.id() == null || profile.id().isBlank()) {
            throw new BadRequestException("Spotify profile lookup failed");
        }
        Map<String, Object> credentials = new HashMap<>();
        credentials.put("accessToken", tokenResponse.accessToken());
        credentials.put("refreshToken", tokenResponse.refreshToken());
        credentials.put("tokenType", tokenResponse.tokenType());
        credentials.put("expiresIn", tokenResponse.expiresIn());

        Map<String, Object> config = new HashMap<>();
        config.put("selectedPlaylistUri", null);
        config.put("selectedPlaylistName", null);
        config.put("spotifyVolume", 70);

        return new ProviderConnectionResult(
            profile.id(),
            profile.displayName() == null || profile.displayName().isBlank() ? profile.id() : profile.displayName(),
            IntegrationAuthType.OAUTH2_AUTHORIZATION_CODE,
            integrationProperties.getSpotify().getScopes(),
            credentials,
            config,
            Instant.now().plusSeconds(tokenResponse.expiresIn())
        );
    }

    @Override
    public ProviderRefreshResult refreshAccessToken(IntegrationAccount integrationAccount, Map<String, Object> credentials) {
        validateConfiguration();
        Object refreshToken = credentials.get("refreshToken");
        if (!(refreshToken instanceof String refreshTokenValue) || refreshTokenValue.isBlank()) {
            throw new BadRequestException("Integration does not have a refresh token");
        }

        TokenResponse tokenResponse = refreshToken(refreshTokenValue);
        if (tokenResponse == null || tokenResponse.accessToken() == null || tokenResponse.expiresIn() == null) {
            throw new BadRequestException("Spotify token refresh failed");
        }
        Map<String, Object> nextCredentials = new HashMap<>(credentials);
        nextCredentials.put("accessToken", tokenResponse.accessToken());
        nextCredentials.put("tokenType", tokenResponse.tokenType());
        nextCredentials.put("expiresIn", tokenResponse.expiresIn());
        if (tokenResponse.refreshToken() != null && !tokenResponse.refreshToken().isBlank()) {
            nextCredentials.put("refreshToken", tokenResponse.refreshToken());
        }

        return new ProviderRefreshResult(
            tokenResponse.accessToken(),
            Instant.now().plusSeconds(tokenResponse.expiresIn()),
            nextCredentials
        );
    }

    private TokenResponse exchangeCode(String code) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "authorization_code");
        formData.add("code", code);
        formData.add("redirect_uri", integrationProperties.getSpotify().getRedirectUri());
        formData.add("client_id", integrationProperties.getSpotify().getClientId());
        formData.add("client_secret", integrationProperties.getSpotify().getClientSecret());
        return restClient.post()
            .uri(URI.create("https://accounts.spotify.com/api/token"))
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(formData)
            .retrieve()
            .body(TokenResponse.class);
    }

    private TokenResponse refreshToken(String refreshToken) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "refresh_token");
        formData.add("refresh_token", refreshToken);
        formData.add("client_id", integrationProperties.getSpotify().getClientId());
        formData.add("client_secret", integrationProperties.getSpotify().getClientSecret());
        return restClient.post()
            .uri(URI.create("https://accounts.spotify.com/api/token"))
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(formData)
            .retrieve()
            .body(TokenResponse.class);
    }

    private SpotifyProfileResponse fetchProfile(String accessToken) {
        return restClient.get()
            .uri(URI.create("https://api.spotify.com/v1/me"))
            .header("Authorization", "Bearer " + accessToken)
            .retrieve()
            .body(SpotifyProfileResponse.class);
    }

    private void validateConfiguration() {
        if (!integrationProperties.getSpotify().isEnabled()) {
            throw new BadRequestException("Spotify integration is disabled");
        }
        if (integrationProperties.getSpotify().getClientId().isBlank()
            || integrationProperties.getSpotify().getClientSecret().isBlank()
            || integrationProperties.getSpotify().getRedirectUri().isBlank()) {
            throw new BadRequestException("Spotify integration is not configured");
        }
    }

    private record TokenResponse(
        @JsonProperty("access_token")
        String accessToken,
        @JsonProperty("token_type")
        String tokenType,
        @JsonProperty("expires_in")
        Integer expiresIn,
        @JsonProperty("refresh_token")
        String refreshToken
    ) {
    }

    private record SpotifyProfileResponse(
        String id,
        @JsonProperty("display_name")
        String displayName
    ) {
    }
}
