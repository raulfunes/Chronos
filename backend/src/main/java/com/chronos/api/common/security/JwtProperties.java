package com.chronos.api.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chronos.jwt")
public record JwtProperties(String secret, long expirationMinutes) {
}
