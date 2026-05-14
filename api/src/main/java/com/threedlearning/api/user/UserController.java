package com.threedlearning.api.user;

import com.threedlearning.api.user.dto.UserProfileResponse;
import com.threedlearning.api.user.dto.UserSyncRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public UserProfileResponse me(@AuthenticationPrincipal AppUser user) {
        return UserProfileResponse.from(user);
    }

    @PutMapping("/me")
    public UserProfileResponse syncMe(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody UserSyncRequest request
    ) {
        user.setDisplayName(request.displayName().trim());

        if (request.email() != null && !request.email().isBlank()) {
            user.setEmail(request.email().trim());
        }

        return UserProfileResponse.from(userRepository.save(user));
    }
}
