package com.chronos.api.integration.service;

import com.chronos.api.common.exception.BadRequestException;
import com.chronos.api.integration.config.IntegrationProperties;
import com.chronos.api.integration.model.IntegrationProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class IntegrationStateService {

    private final SecretKey signingKey;

    public IntegrationStateService(IntegrationProperties integrationProperties) {
        byte[] secretBytes = integrationProperties.getEncryptionKey().getBytes(StandardCharsets.UTF_8);
        byte[] expandedKey = new byte[Math.max(secretBytes.length, 32)];
        System.arraycopy(secretBytes, 0, expandedKey, 0, secretBytes.length);
        Key key = Keys.hmacShaKeyFor(expandedKey);
        this.signingKey = (SecretKey) key;
    }

    public String issue(Long userId, IntegrationProvider provider) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject("integration-connect")
            .claim("userId", userId)
            .claim("provider", provider.name())
            .issuedAt(java.util.Date.from(now))
            .expiration(java.util.Date.from(now.plus(10, ChronoUnit.MINUTES)))
            .signWith(signingKey)
            .compact();
    }

    public ParsedIntegrationState parse(String token, IntegrationProvider expectedProvider) {
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
            IntegrationProvider provider = IntegrationProvider.valueOf(String.valueOf(claims.get("provider")));
            if (provider != expectedProvider) {
                throw new BadRequestException("Integration callback provider mismatch");
            }
            return new ParsedIntegrationState(Long.valueOf(String.valueOf(claims.get("userId"))), provider);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Invalid integration callback state");
        }
    }

    public record ParsedIntegrationState(Long userId, IntegrationProvider provider) {
    }
}
