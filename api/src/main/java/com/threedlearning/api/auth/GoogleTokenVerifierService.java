package com.threedlearning.api.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GoogleTokenVerifierService {

    private final GoogleIdTokenVerifier verifier;
    private final boolean configured;

    public GoogleTokenVerifierService(@Value("${google.client-id}") String googleClientId) {
        if (googleClientId == null || googleClientId.isBlank()) {
            configured = false;
            verifier = null;
            return;
        }

        configured = true;
        verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(googleClientId))
                .build();
    }

    public GoogleIdentity verify(String idToken) {
        if (!configured || verifier == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Google login is not configured on the server.");
        }

        try {
            GoogleIdToken googleIdToken = verifier.verify(idToken);

            if (googleIdToken == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token.");
            }

            GoogleIdToken.Payload payload = googleIdToken.getPayload();
            String subject = payload.getSubject();
            String email = payload.getEmail();
            Object emailVerified = payload.get("email_verified");

            if (subject == null || subject.isBlank() || email == null || email.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google profile is missing required fields.");
            }

            if (emailVerified instanceof Boolean verified && !verified) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email is not verified.");
            }

            String name = (String) payload.get("name");
            return new GoogleIdentity(subject, email, name);
        } catch (GeneralSecurityException | IOException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token verification failed.");
        }
    }

    public record GoogleIdentity(String subject, String email, String name) {
    }
}
