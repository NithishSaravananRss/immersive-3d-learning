package com.threedlearning.api.progress;

import com.threedlearning.api.progress.dto.ProgressUpdateRequest;
import com.threedlearning.api.progress.dto.UserProgressResponse;
import com.threedlearning.api.user.AppUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/progress")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    @GetMapping("/me")
    public List<UserProgressResponse> mine(@AuthenticationPrincipal AppUser user) {
        return progressService.getMyProgress(user);
    }

    @PutMapping("/me/{nodeId}")
    public UserProgressResponse update(
            @AuthenticationPrincipal AppUser user,
            @PathVariable UUID nodeId,
            @Valid @RequestBody ProgressUpdateRequest request
    ) {
        return progressService.upsert(user, nodeId, request);
    }
}
