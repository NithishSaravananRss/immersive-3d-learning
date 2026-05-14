package com.threedlearning.api.node;

import com.threedlearning.api.node.dto.LearningNodeRequest;
import com.threedlearning.api.node.dto.LearningNodeResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/nodes")
public class LearningNodeController {

    private final LearningNodeService learningNodeService;

    public LearningNodeController(LearningNodeService learningNodeService) {
        this.learningNodeService = learningNodeService;
    }

    @GetMapping
    public List<LearningNodeResponse> all() {
        return learningNodeService.getAllNodes();
    }

    @GetMapping("/{id}")
    public LearningNodeResponse byId(@PathVariable UUID id) {
        return learningNodeService.getNode(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LearningNodeResponse create(@Valid @RequestBody LearningNodeRequest request) {
        return learningNodeService.createNode(request);
    }

    @PutMapping("/{id}")
    public LearningNodeResponse update(@PathVariable UUID id, @Valid @RequestBody LearningNodeRequest request) {
        return learningNodeService.updateNode(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        learningNodeService.deleteNode(id);
    }
}
