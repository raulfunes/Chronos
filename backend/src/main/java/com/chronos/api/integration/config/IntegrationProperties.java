package com.chronos.api.integration.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chronos.integrations")
public class IntegrationProperties {

    private String encryptionKey = "chronos-integration-key-chronos-integration-key";
    private String frontendBaseUrl = "http://localhost:3000";
    private final Spotify spotify = new Spotify();

    public String getEncryptionKey() {
        return encryptionKey;
    }

    public void setEncryptionKey(String encryptionKey) {
        this.encryptionKey = encryptionKey;
    }

    public String getFrontendBaseUrl() {
        return frontendBaseUrl;
    }

    public void setFrontendBaseUrl(String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public Spotify getSpotify() {
        return spotify;
    }

    public static class Spotify {

        private boolean enabled = false;
        private String clientId = "";
        private String clientSecret = "";
        private String redirectUri = "http://localhost:8082/api/v1/integrations/spotify/callback";
        private List<String> scopes = new ArrayList<>(List.of(
            "playlist-read-private",
            "playlist-read-collaborative",
            "user-read-email",
            "user-read-private",
            "user-read-playback-state",
            "user-modify-playback-state",
            "streaming"
        ));

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getClientSecret() {
            return clientSecret;
        }

        public void setClientSecret(String clientSecret) {
            this.clientSecret = clientSecret;
        }

        public String getRedirectUri() {
            return redirectUri;
        }

        public void setRedirectUri(String redirectUri) {
            this.redirectUri = redirectUri;
        }

        public List<String> getScopes() {
            return scopes;
        }

        public void setScopes(List<String> scopes) {
            this.scopes = scopes;
        }
    }
}
