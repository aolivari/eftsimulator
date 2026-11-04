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

    // Si ya existe un worktree válido (por ejemplo una ejecución en curso o reintentada), reutilizarlo
    if (fs.existsSync(worktreePath) && fs.existsSync(path.join(worktreePath, '.git'))) {
      console.log(`♻️ Reutilizando worktree existente en: ${worktreePath} (Rama: ${branchName})...`);
      this.ensureWorktreeDeps(worktreePath);
      return worktreePath;
    }

    // Si existe carpeta corrupta sin .git, limpiarla
    if (fs.existsSync(worktreePath)) {
      this.removeWorktree(worktreePath, branchName);
    }

    // Traer SIEMPRE la última versión de origin/master antes de crear el worktree
    console.log(`🔄 Sincronizando referencias con origin/master...`);
    this.runGit('git fetch origin master');

    // Crear (o resetear con -B si quedó huérfana) la rama SIEMPRE desde origin/master, nunca desde master local
    console.log(`🌿 Creando worktree en: ${worktreePath} (Rama: ${branchName} desde origin/master)...`);
    this.runGit(`git worktree add -B "${branchName}" "${worktreePath}" origin/master`);

    this.ensureWorktreeDeps(worktreePath);
    return worktreePath;
  }

  ensureWorktreeDeps(worktreePath) {
    // Copiar .env.local si existe en la raíz para que el agente disponga de las claves en sus pruebas
    const rootEnvLocal = path.join(this.projectRoot, '.env.local');
    const wtEnvLocal = path.join(worktreePath, '.env.local');
    if (fs.existsSync(rootEnvLocal) && !fs.existsSync(wtEnvLocal)) {
      try {
        fs.copyFileSync(rootEnvLocal, wtEnvLocal);
      } catch {}
    }

    // Enlazar node_modules para que npm run build / lint / tsc funcionen inmediatamente en el worktree
    const rootNodeModules = path.join(this.projectRoot, 'node_modules');
    const wtNodeModules = path.join(worktreePath, 'node_modules');
    if (fs.existsSync(rootNodeModules) && !fs.existsSync(wtNodeModules)) {
      try {
        fs.symlinkSync(rootNodeModules, wtNodeModules, 'junction');
      } catch {}
    }
  }

  hasChanges(worktreePath) {
    const status = this.runGit('git status --porcelain', worktreePath);
    return status.length > 0;
  }

  getChangedFilesList(worktreePath) {
    try {
      return this.runGit('git status --short', worktreePath);
    } catch {
      return '';
    }
  }

  getDiffStat(worktreePath) {
    try {
      return this.runGit('git diff --stat HEAD', worktreePath);
    } catch {
      return '';
    }
  }

  commitAndPush(worktreePath, branchName, message) {
    console.log(`💾 Guardando cambios en ${branchName}...`);
    this.runGit('git add -A', worktreePath);

    // Excluir nunca subir archivos de entorno ni node_modules por seguridad
    try {
      this.runGit('git reset HEAD .env .env.local node_modules', worktreePath);
    } catch {}

    if (this.hasChanges(worktreePath)) {
      const escapedMsg = message.replace(/"/g, '\\"');
      this.runGit(`git commit -m "${escapedMsg}"`, worktreePath);
    }

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
    // Desvincular junction de node_modules antes de eliminar para no afectar a la raíz
    const wtNodeModules = path.join(worktreePath, 'node_modules');
    if (fs.existsSync(wtNodeModules)) {
      try {
        fs.unlinkSync(wtNodeModules);
      } catch {}
    }
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
