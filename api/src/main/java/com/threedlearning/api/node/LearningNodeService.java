package com.threedlearning.api.node;

import com.threedlearning.api.node.dto.LearningNodeRequest;
import com.threedlearning.api.node.dto.LearningNodeResponse;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningNodeService {

    private final LearningNodeRepository learningNodeRepository;
    private final NodeRelationshipRepository nodeRelationshipRepository;

    public LearningNodeService(
            LearningNodeRepository learningNodeRepository,
            NodeRelationshipRepository nodeRelationshipRepository
    ) {
        this.learningNodeRepository = learningNodeRepository;
        this.nodeRelationshipRepository = nodeRelationshipRepository;
    }

    @Transactional(readOnly = true)
    public List<LearningNodeResponse> getAllNodes() {
        return learningNodeRepository.findAllByOrderByTitleAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LearningNodeResponse getNode(UUID id) {
        return toResponse(findNode(id));
    }

    @Transactional
    public LearningNodeResponse createNode(LearningNodeRequest request) {
        LearningNode node = new LearningNode();
        apply(node, request);
        return toResponse(learningNodeRepository.save(node));
    }

    @Transactional
    public LearningNodeResponse updateNode(UUID id, LearningNodeRequest request) {
        LearningNode node = findNode(id);
        apply(node, request);
        return toResponse(learningNodeRepository.save(node));
    }

    @Transactional
    public void deleteNode(UUID id) {
        learningNodeRepository.delete(findNode(id));
    }

    private LearningNode findNode(UUID id) {
        return learningNodeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Learning node not found: " + id));
    }

    private void apply(LearningNode node, LearningNodeRequest request) {
        node.setSlug(request.slug());
        node.setCategory(request.category());
        node.setTitle(request.title());
        node.setSummary(request.summary());
        node.setPrompt(request.prompt());
        node.setColor(request.color());
        node.setPublished(request.published());
        node.setPositionX(request.position().x());
        node.setPositionY(request.position().y());
        node.setPositionZ(request.position().z());
        node.setDetails(request.details());
    }

    private LearningNodeResponse toResponse(LearningNode node) {
        List<UUID> relatedIds = nodeRelationshipRepository.findAllBySourceNodeId(node.getId()).stream()
                .map(relationship -> relationship.getTargetNode().getId())
                .toList();

        return LearningNodeResponse.from(node, relatedIds);
    }
}
