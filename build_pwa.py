import os
import shutil
from pathlib import Path

def build_pwa_project():
    """构建PWA项目，复制所有必要文件到输出目录"""
    
    # 项目根目录（当前脚本所在目录）
    project_root = Path(__file__).parent.absolute()
    
    # 输出目录
    output_dir = project_root / "pwa_output"
    
    # 需要复制的文件和目录列表
    source_files = [
        "index.html",
        "style.css",
        "app.js",
        "manifest.json",
        "sw.js"
    ]
    
    # 需要复制的目录
    source_dirs = [
        "icons"
    ]
    
    print(f"项目根目录: {project_root}")
    print(f"输出目录: {output_dir}")
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 复制文件
    for file_name in source_files:
        source_path = project_root / file_name
        dest_path = output_dir / file_name
        
        if source_path.exists():
            shutil.copy2(source_path, dest_path)
            print(f"✓ 复制文件: {file_name}")
        else:
            print(f"✗ 文件不存在: {file_name}")
    
    # 复制目录
    for dir_name in source_dirs:
        source_path = project_root / dir_name
        dest_path = output_dir / dir_name
        
        if source_path.exists() and source_path.is_dir():
            if dest_path.exists():
                shutil.rmtree(dest_path)
            shutil.copytree(source_path, dest_path)
            print(f"✓ 复制目录: {dir_name}")
        else:
            print(f"✗ 目录不存在: {dir_name}")
    
    # 检查文件完整性
    print("\n输出目录内容:")
    for item in output_dir.rglob("*"):
        if item.is_file():
            size_kb = item.stat().st_size / 1024
            print(f"  - {item.relative_to(output_dir)} ({size_kb:.1f} KB)")
    
    # 生成成功信息
    total_size = sum(f.stat().st_size for f in output_dir.rglob('*') if f.is_file())
    print(f"\n✅ 构建完成！")
    print(f"   输出目录: {output_dir}")
    print(f"   文件总数: {len(list(output_dir.rglob('*'))) - len(list(output_dir.rglob('*/')))}")
    print(f"   总大小: {total_size / 1024:.1f} KB")

if __name__ == "__main__":
    build_pwa_project()