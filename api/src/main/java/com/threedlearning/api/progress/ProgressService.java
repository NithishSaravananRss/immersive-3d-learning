package com.threedlearning.api.progress;

import com.threedlearning.api.node.LearningNode;
import com.threedlearning.api.node.LearningNodeRepository;
import com.threedlearning.api.progress.dto.ProgressUpdateRequest;
import com.threedlearning.api.progress.dto.UserProgressResponse;
import com.threedlearning.api.user.AppUser;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProgressService {

    private final LearningNodeRepository learningNodeRepository;
    private final UserProgressRepository userProgressRepository;

    public ProgressService(
            LearningNodeRepository learningNodeRepository,
            UserProgressRepository userProgressRepository
    ) {
        this.learningNodeRepository = learningNodeRepository;
        this.userProgressRepository = userProgressRepository;
    }

    @Transactional(readOnly = true)
    public List<UserProgressResponse> getMyProgress(AppUser user) {
        return userProgressRepository.findAllByUserId(user.getId()).stream()
                .map(UserProgressResponse::from)
                .toList();
    }

    @Transactional
    public UserProgressResponse upsert(AppUser user, UUID nodeId, ProgressUpdateRequest request) {
        LearningNode node = learningNodeRepository.findById(nodeId)
                .orElseThrow(() -> new EntityNotFoundException("Learning node not found: " + nodeId));

        UserProgress progress = userProgressRepository.findByUserIdAndNodeId(user.getId(), nodeId)
                .orElseGet(UserProgress::new);

        progress.setUser(user);
        progress.setNode(node);
        progress.setCompleted(request.completed());
        progress.setMasteryScore(request.masteryScore());
        progress.setLastVisitedAt(Instant.now());

        return UserProgressResponse.from(userProgressRepository.save(progress));
    }
}
