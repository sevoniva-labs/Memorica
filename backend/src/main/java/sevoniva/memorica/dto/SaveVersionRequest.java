package sevoniva.memorica.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SaveVersionRequest {
    @NotBlank(message = "内容不能为空")
    private String contentJson;

    private String snapshotHtml;

    @NotNull
    private Integer wordCount;

    @NotNull
    private Integer charCount;
}
