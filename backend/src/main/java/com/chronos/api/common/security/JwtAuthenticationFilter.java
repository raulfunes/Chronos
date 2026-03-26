package com.chronos.api.common.security;

import com.chronos.api.common.logging.RequestLoggingConstants;
import com.chronos.api.user.repository.AppUserRepository;
import com.chronos.api.user.model.UserRole;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;

    public JwtAuthenticationFilter(JwtService jwtService, AppUserRepository appUserRepository) {
        this.jwtService = jwtService;
        this.appUserRepository = appUserRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        Claims claims;
        try {
            claims = jwtService.extractAllClaims(token);
        } catch (RuntimeException ex) {
            log.warn(
                "Rejected authentication method={} path={} reason=invalid_jwt detail={} requestId={}",
                request.getMethod(),
                request.getRequestURI(),
                ex.getClass().getSimpleName(),
                currentRequestId()
            );
            filterChain.doFilter(request, response);
            return;
        }

        String subject = claims.getSubject();
        if (!StringUtils.hasText(subject)) {
            log.warn(
                "Rejected authentication method={} path={} reason=missing_subject requestId={}",
                request.getMethod(),
                request.getRequestURI(),
                currentRequestId()
            );
            filterChain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            log.warn(
                "Rejected authentication method={} path={} reason=authentication_discarded subject={} requestId={}",
                request.getMethod(),
                request.getRequestURI(),
                subject,
                currentRequestId()
            );
            filterChain.doFilter(request, response);
            return;
        }

        AuthenticatedUser principal;
        if ("guest".equals(subject)) {
            principal = new AuthenticatedUser(-1L, "guest@chronos.local", "", UserRole.GUEST);
        } else {
            principal = appUserRepository.findByEmailIgnoreCase(subject)
                .map(AuthenticatedUser::new)
                .orElse(null);
            if (principal == null) {
                log.warn(
                    "Rejected authentication method={} path={} reason=user_not_found subject={} requestId={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    subject,
                    currentRequestId()
                );
                filterChain.doFilter(request, response);
                return;
            }
            if (!jwtService.isTokenValid(claims, subject)) {
                log.warn(
                    "Rejected authentication method={} path={} reason=token_validation_failed subject={} requestId={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    subject,
                    currentRequestId()
                );
                filterChain.doFilter(request, response);
                return;
            }
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            principal,
            null,
            principal.getAuthorities()
        );
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private String currentRequestId() {
        String requestId = MDC.get(RequestLoggingConstants.REQUEST_ID_MDC_KEY);
        return requestId == null ? "n/a" : requestId;
    }
}
