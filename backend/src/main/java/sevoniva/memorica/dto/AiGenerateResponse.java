package sevoniva.memorica.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiGenerateResponse {
    private String provider;
    private String model;
    private String text;
}
