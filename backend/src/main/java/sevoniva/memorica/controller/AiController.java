package sevoniva.memorica.controller;

import sevoniva.memorica.dto.AiGenerateRequest;
import sevoniva.memorica.dto.AiGenerateResponse;
import sevoniva.memorica.dto.ApiResponse;
import sevoniva.memorica.service.ai.AiService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/generate")
    public ApiResponse<AiGenerateResponse> generate(@Valid @RequestBody AiGenerateRequest request) {
        return ApiResponse.success(aiService.generate(request));
    }
}
