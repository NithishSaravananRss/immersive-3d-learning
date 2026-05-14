package com.threedlearning.api.security;

import com.threedlearning.api.user.AppUser;
import com.threedlearning.api.user.UserRepository;
import com.threedlearning.api.user.UserRole;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClerkUserService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public ClerkUserService(PasswordEncoder passwordEncoder, UserRepository userRepository) {
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    @Transactional
    public AppUser getOrCreateUser(Jwt jwt) {
        String subject = jwt.getSubject();

        return userRepository.findByClerkSubject(subject)
                .or(() -> findExistingEmailUser(jwt, subject))
                .orElseGet(() -> createUser(jwt, subject));
    }

    private java.util.Optional<AppUser> findExistingEmailUser(Jwt jwt, String subject) {
        String email = getEmail(jwt);

        if (email == null || email.isBlank()) {
            return java.util.Optional.empty();
        }

        return userRepository.findByEmailIgnoreCase(email)
                .map((user) -> {
                    user.setClerkSubject(subject);
                    return userRepository.save(user);
                });
    }

    private AppUser createUser(Jwt jwt, String subject) {
        AppUser user = new AppUser();
        user.setClerkSubject(subject);
        user.setUsername(generateUniqueUsername(subject));
        user.setEmail(getEmail(jwt) != null ? getEmail(jwt) : subject + "@clerk.local");
        user.setDisplayName(getDisplayName(jwt));
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(UserRole.STUDENT);
        return userRepository.save(user);
    }

    private String getEmail(Jwt jwt) {
        String email = jwt.getClaimAsString("email");

        if (email == null || email.isBlank()) {
            email = jwt.getClaimAsString("email_address");
        }

        return email == null || email.isBlank() ? null : email.trim();
    }

    private String getDisplayName(Jwt jwt) {
        String name = jwt.getClaimAsString("name");

        if (name == null || name.isBlank()) {
            name = jwt.getClaimAsString("full_name");
        }

        if (name == null || name.isBlank()) {
            name = jwt.getClaimAsString("given_name");
        }

        return name == null || name.isBlank() ? "Learner" : name.trim();
    }

    private String generateUniqueUsername(String subject) {
        String base = subject
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "-");

        if (base.length() > 42) {
            base = base.substring(0, 42);
        }

        String candidate = "clerk-" + base;
        int suffix = 1;

        while (userRepository.existsByUsernameIgnoreCase(candidate)) {
            String suffixText = "-" + suffix;
            int maxBaseLength = Math.min(base.length(), 50 - "clerk-".length() - suffixText.length());
            candidate = "clerk-" + base.substring(0, maxBaseLength) + suffixText;
            suffix++;
        }

        return candidate;
    }
}
