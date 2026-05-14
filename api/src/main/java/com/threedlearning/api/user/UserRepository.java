package com.threedlearning.api.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<AppUser> findByEmailIgnoreCase(String email);

    Optional<AppUser> findByClerkSubject(String clerkSubject);

    Optional<AppUser> findByGoogleSubject(String googleSubject);

    Optional<AppUser> findByUsernameIgnoreCase(String username);
}
