import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export class GitWorktreeManager {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.worktreesBase = path.resolve(projectRoot, '.worktrees');
    if (!fs.existsSync(this.worktreesBase)) {
      fs.mkdirSync(this.worktreesBase, { recursive: true });
    }
  }

  runGit(cmd, cwd = this.projectRoot) {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  }

  createWorktree(branchName) {
    const safeBranchDir = branchName.replace(/[\/\\]/g, '-');
    const worktreePath = path.resolve(this.worktreesBase, safeBranchDir);

    // Si ya existe la carpeta por un fallo previo, limpiarla
    if (fs.existsSync(worktreePath)) {
      this.removeWorktree(worktreePath, branchName);
    }

    // Traer la última versión de main
    try {
      this.runGit('git fetch origin main');
    } catch {
      // Si estamos offline o no hay remoto, usar main local
    }

    // Crear la rama y el worktree
    console.log(`🌿 Creando worktree en: ${worktreePath} (Rama: ${branchName})...`);
    try {
      this.runGit(`git worktree add -b "${branchName}" "${worktreePath}" HEAD`);
    } catch (err) {
      // Si la rama ya existe, hacer checkout de esa rama
      this.runGit(`git worktree add "${worktreePath}" "${branchName}"`);
    }

    return worktreePath;
  }

  hasChanges(worktreePath) {
    const status = this.runGit('git status --porcelain', worktreePath);
    return status.length > 0;
  }

  commitAndPush(worktreePath, branchName, message) {
    console.log(`💾 Guardando cambios en ${branchName}...`);
    this.runGit('git add -A', worktreePath);
    
    // Solo commitear si hay cambios
    if (this.hasChanges(worktreePath)) {
      const escapedMsg = message.replace(/"/g, '\\"');
      this.runGit(`git commit -m "${escapedMsg}"`, worktreePath);
    }

    // Intentar push al repositorio remoto
    try {
      console.log(`🚀 Subiendo rama ${branchName} al repositorio remoto...`);
      this.runGit(`git push -u origin "${branchName}"`, worktreePath);
      return true;
    } catch (err) {
      console.warn(`⚠️ No se pudo hacer push a origin (¿modo offline o sin permisos?): ${err.message}`);
      return false;
    }
  }

  removeWorktree(worktreePath, branchName) {
    console.log(`🧹 Limpiando worktree en: ${worktreePath}...`);
    try {
      this.runGit(`git worktree remove --force "${worktreePath}"`);
    } catch {
      if (fs.existsSync(worktreePath)) {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
      this.runGit('git worktree prune');
    }
  }
}
