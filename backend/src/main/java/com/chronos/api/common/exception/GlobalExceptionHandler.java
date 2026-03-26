package com.chronos.api.common.exception;

import com.chronos.api.common.logging.RequestLoggingConstants;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        log.warn(
            "Handled exception status={} type={} message={} requestId={}",
            HttpStatus.NOT_FOUND.value(),
            ex.getClass().getSimpleName(),
            ex.getMessage(),
            currentRequestId()
        );
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(BadRequestException ex) {
        log.warn(
            "Handled exception status={} type={} message={} requestId={}",
            HttpStatus.BAD_REQUEST.value(),
            ex.getClass().getSimpleName(),
            ex.getMessage(),
            currentRequestId()
        );
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("message", "Validation failed");
        body.put("errors", errors);
        log.warn(
            "Handled exception status={} type={} errorCount={} requestId={}",
            HttpStatus.BAD_REQUEST.value(),
            ex.getClass().getSimpleName(),
            errors.size(),
            currentRequestId()
        );
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        log.warn(
            "Handled exception status={} type={} message={} requestId={}",
            HttpStatus.FORBIDDEN.value(),
            ex.getClass().getSimpleName(),
            "Access denied",
            currentRequestId()
        );
        return build(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnknown(Exception ex) {
        log.error(
            "Unhandled exception status={} type={} requestId={}",
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            ex.getClass().getSimpleName(),
            currentRequestId(),
            ex
        );
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now());
        body.put("status", status.value());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }

    private String currentRequestId() {
        String requestId = MDC.get(RequestLoggingConstants.REQUEST_ID_MDC_KEY);
        return requestId == null ? "n/a" : requestId;
    }
}
