package com.threedlearning.api.auth;

import com.threedlearning.api.auth.dto.AuthResponse;
import com.threedlearning.api.auth.dto.GoogleAuthRequest;
import com.threedlearning.api.auth.dto.LoginRequest;
import com.threedlearning.api.auth.dto.RegisterRequest;
import com.threedlearning.api.user.Gender;
import com.threedlearning.api.security.JwtService;
import com.threedlearning.api.user.AppUser;
import com.threedlearning.api.user.UserRepository;
import com.threedlearning.api.user.UserRole;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public AuthService(
            AuthenticationManager authenticationManager,
            GoogleTokenVerifierService googleTokenVerifierService,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            UserRepository userRepository
    ) {
        this.authenticationManager = authenticationManager;
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        AppUser user = userRepository.findByUsernameIgnoreCase(request.username())
                .orElseThrow();

        return AuthResponse.from(jwtService.generateToken(user), user);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new ResponseStatusException(CONFLICT, "Username is already taken.");
        }

        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(CONFLICT, "Email is already registered.");
        }

        AppUser user = new AppUser();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setDisplayName(request.displayName());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.STUDENT);

        AppUser savedUser = userRepository.save(user);

        return AuthResponse.from(jwtService.generateToken(savedUser), savedUser);
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        if (request.role() == UserRole.ADMIN) {
            throw new ResponseStatusException(BAD_REQUEST, "Google signup cannot request ADMIN role.");
        }

        if (request.role() == UserRole.STUDENT && request.gender() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Student profile requires gender.");
        }

        GoogleTokenVerifierService.GoogleIdentity identity = googleTokenVerifierService.verify(request.idToken());

        AppUser user = userRepository.findByGoogleSubject(identity.subject())
                .or(() -> userRepository.findByEmailIgnoreCase(identity.email()))
                .orElseGet(AppUser::new);

        if (user.getGoogleSubject() != null && !user.getGoogleSubject().equals(identity.subject())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Google identity mismatch for this account.");
        }

        if (user.getUsername() == null || user.getUsername().isBlank()) {
            user.setUsername(generateUniqueUsername(identity.email()));
        }

        user.setGoogleSubject(identity.subject());
        user.setEmail(identity.email());
        user.setDisplayName(request.name().trim());
        user.setEducationType(request.educationType());

        Gender gender = request.role() == UserRole.STUDENT ? request.gender() : null;
        user.setGender(gender);

        if (user.getRole() != UserRole.ADMIN) {
            user.setRole(request.role());
        }

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        }

        AppUser savedUser = userRepository.save(user);
        return AuthResponse.from(jwtService.generateToken(savedUser), savedUser);
    }

    private String generateUniqueUsername(String email) {
        String[] parts = email.split("@", 2);
        String base = parts[0]
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "")
                .replaceAll("^[._-]+", "")
                .replaceAll("[._-]+$", "");

        if (base.isBlank()) {
            base = "learner";
        }

        String candidate = base;
        int suffix = 1;

        while (userRepository.existsByUsernameIgnoreCase(candidate)) {
            candidate = base + suffix;
            suffix++;
        }

        return candidate;
    }
}
