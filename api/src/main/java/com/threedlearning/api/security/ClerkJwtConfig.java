package com.threedlearning.api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class ClerkJwtConfig {

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${clerk.jwks-url}") String jwksUrl,
            @Value("${clerk.issuer:}") String issuer
    ) {
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl).build();
        OAuth2TokenValidator<Jwt> validator = new JwtTimestampValidator();

        if (issuer != null && !issuer.isBlank()) {
            validator = new DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefaultWithIssuer(issuer),
                    new JwtTimestampValidator()
            );
        }

        jwtDecoder.setJwtValidator(validator);
        return jwtDecoder;
    }
}
