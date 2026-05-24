package sevoniva.memorica.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateFolderRequest {
    @NotBlank(message = "文件夹名称不能为空")
    @Size(max = 255, message = "文件夹名称长度不能超过 255 个字符")
    private String title;

    @Size(max = 64, message = "空间标识长度不能超过 64 个字符")
    private String workspaceId;

    @Size(max = 64, message = "父级目录标识长度不能超过 64 个字符")
    private String parentId;
}
