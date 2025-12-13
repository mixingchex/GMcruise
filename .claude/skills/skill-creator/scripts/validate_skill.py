#!/usr/bin/env python3
"""
validate_skill.py - 스킬 유효성 검사

Usage:
    python validate_skill.py /path/to/skill-folder

Checks:
    - SKILL.md 존재 여부
    - YAML frontmatter 형식
    - name 규칙 (64자, 소문자+숫자+하이픈)
    - description 규칙 (1024자, 비어있지 않음)
    - 콜론(:) 금지 규칙
    - 참조 파일 존재 여부
    - 줄바꿈 형식 (LF vs CRLF)
"""

import sys
import os
import re
from pathlib import Path

def validate_skill(skill_path):
    skill_dir = Path(skill_path)
    errors = []
    warnings = []
    
    # 1. SKILL.md 존재 확인
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        errors.append("SKILL.md not found")
        return errors, warnings
    
    content = skill_md.read_text(encoding='utf-8')
    
    # 2. CRLF 체크
    if '\r\n' in content:
        errors.append("CRLF line endings detected. Use LF (Unix) format.")
    
    # 3. YAML frontmatter 파싱
    if not content.startswith('---'):
        errors.append("Missing YAML frontmatter (must start with ---)")
        return errors, warnings
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        errors.append("Invalid YAML frontmatter format")
        return errors, warnings
    
    frontmatter = parts[1].strip()
    
    # 4. name 필드 확인
    name_match = re.search(r'^name:\s*(.+)$', frontmatter, re.MULTILINE)
    if not name_match:
        errors.append("Missing 'name' field in frontmatter")
    else:
        name = name_match.group(1).strip().strip('"\'')
        if len(name) > 64:
            errors.append(f"name exceeds 64 characters: {len(name)}")
        if not re.match(r'^[a-z0-9-]+$', name):
            errors.append(f"name must use only lowercase, numbers, hyphens: {name}")
        if 'anthropic' in name.lower() or 'claude' in name.lower():
            errors.append(f"name contains reserved word: {name}")
    
    # 5. description 필드 확인
    desc_match = re.search(r'^description:\s*["\'](.+)["\']$', frontmatter, re.MULTILINE)
    if not desc_match:
        desc_match = re.search(r'^description:\s*(.+)$', frontmatter, re.MULTILINE)
    
    if not desc_match:
        errors.append("Missing 'description' field in frontmatter")
    else:
        desc = desc_match.group(1).strip().strip('"\'')
        if len(desc) > 1024:
            errors.append(f"description exceeds 1024 characters: {len(desc)}")
        if len(desc) == 0:
            errors.append("description is empty")
        
        if re.search(r'\w:\s+', desc):
            warnings.append("description contains colon followed by space - may cause YAML parsing issues")
    
    # 6. 금지된 키 확인
    forbidden_keys = ['version', 'auto_trigger', 'dependencies', 'license']
    for key in forbidden_keys:
        if re.search(rf'^{key}:', frontmatter, re.MULTILINE):
            warnings.append(f"Non-standard key in frontmatter: {key}")
    
    # 7. 참조 파일 확인
    body = parts[2]
    refs = re.findall(r'\[.*?\]\(([^)]+\.md)\)', body)
    for ref in refs:
        ref_path = skill_dir / ref
        if not ref_path.exists():
            warnings.append(f"Referenced file not found: {ref}")
    
    # 8. 줄 수 체크
    lines = content.split('\n')
    if len(lines) > 500:
        warnings.append(f"SKILL.md has {len(lines)} lines (recommended: <500)")
    
    return errors, warnings

def main():
    if len(sys.argv) != 2:
        print("Usage: python validate_skill.py /path/to/skill-folder")
        sys.exit(1)
    
    skill_path = sys.argv[1]
    
    if not os.path.isdir(skill_path):
        print(f"Error: {skill_path} is not a directory")
        sys.exit(1)
    
    errors, warnings = validate_skill(skill_path)
    
    if errors:
        print("[X] ERRORS:")
        for e in errors:
            print(f"  - {e}")
    
    if warnings:
        print("[!] WARNINGS:")
        for w in warnings:
            print(f"  - {w}")
    
    if not errors and not warnings:
        print("[OK] Skill is valid!")
        sys.exit(0)
    elif errors:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
