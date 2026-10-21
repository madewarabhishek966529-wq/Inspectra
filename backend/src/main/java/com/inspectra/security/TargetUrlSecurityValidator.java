package com.inspectra.security;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;

@Component
public class TargetUrlSecurityValidator {

    public record ValidationResult(boolean safe, String reason, String normalizedUrl) {}

    public ValidationResult validate(String urlString, boolean allowPrivateIps) {
        if (urlString == null || urlString.isBlank()) {
            return new ValidationResult(false, "Target URL cannot be empty.", null);
        }

        URI uri;
        try {
            uri = URI.create(urlString.trim());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return new ValidationResult(false, "Malformed URL: missing scheme or host.", null);
            }
        } catch (Exception e) {
            return new ValidationResult(false, "Invalid URL syntax: " + e.getMessage(), null);
        }

        String scheme = uri.getScheme().toLowerCase();
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            return new ValidationResult(false, "Unsupported scheme: " + scheme + ". Only http:// and https:// are permitted.", null);
        }

        String host = uri.getHost().toLowerCase();

        // Cloud instance metadata protection
        if (host.equals("169.254.169.254") || host.contains("metadata.google.internal") || host.contains("169.254.")) {
            return new ValidationResult(false, "Access to cloud instance metadata service is prohibited.", null);
        }

        try {
            InetAddress address = InetAddress.getByName(host);
            boolean isLoopback = address.isLoopbackAddress() || host.equals("localhost") || host.endsWith(".localhost");
            boolean isSiteLocal = address.isSiteLocalAddress() || address.isLinkLocalAddress();

            if ((isLoopback || isSiteLocal) && !allowPrivateIps) {
                return new ValidationResult(false,
                        "Target host (" + address.getHostAddress() + ") resolved to a private/internal network. Enable development private testing in project configuration to test internal servers.",
                        null);
            }

            return new ValidationResult(true, "Target URL validated successfully.", uri.toString());
        } catch (Exception e) {
            return new ValidationResult(false, "Cannot resolve target hostname '" + host + "': " + e.getMessage(), null);
        }
    }
}
