const fs = require('fs');
const path = require('path');

const PROJECTS_FILE = 'projects.json';
const PROJECT_FILE = 'project.json';

/**
 * Load all projects from the projects.json file.
 * @param {string} outputDir - Base output directory
 * @returns {Object} - { projects: [], lastOpenedProjectId: string|null }
 */
function loadProjects(outputDir) {
  const projectsPath = path.join(outputDir, PROJECTS_FILE);
  if (fs.existsSync(projectsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
      return {
        projects: data.projects || [],
        lastOpenedProjectId: data.lastOpenedProjectId || null
      };
    } catch {
      return { projects: [], lastOpenedProjectId: null };
    }
  }
  return { projects: [], lastOpenedProjectId: null };
}

/**
 * Save projects to the projects.json file.
 * @param {string} outputDir - Base output directory
 * @param {Object} data - { projects: [], lastOpenedProjectId: string|null }
 */
function saveProjects(outputDir, data) {
  fs.mkdirSync(outputDir, { recursive: true });
  const projectsPath = path.join(outputDir, PROJECTS_FILE);
  fs.writeFileSync(projectsPath, JSON.stringify({
    projects: data.projects || [],
    lastOpenedProjectId: data.lastOpenedProjectId || null
  }, null, 2));
}

/**
 * Generate a unique project ID.
 * @returns {string}
 */
function generateProjectId() {
  return `proj_${Date.now()}`;
}

/**
 * Sanitize a project name for use as a folder name.
 * @param {string} name - Project name
 * @returns {string} - Safe folder name
 */
function sanitizeFolderName(name) {
  // Replace invalid characters and trim
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Get the folder path for a project.
 * If project has a custom folder, use it. Otherwise derive from name.
 * @param {string} outputDir - Base output directory
 * @param {string|Object} projectOrName - Project object or project name (legacy)
 * @returns {string} - Project folder path
 */
function getProjectFolderPath(outputDir, projectOrName) {
  // If passed a project object with a folder property, use it
  if (typeof projectOrName === 'object' && projectOrName !== null) {
    if (projectOrName.folder) {
      return projectOrName.folder;
    }
    // Fall back to deriving from name
    return path.join(outputDir, sanitizeFolderName(projectOrName.name));
  }
  // Legacy: passed a string (project name)
  return path.join(outputDir, sanitizeFolderName(projectOrName));
}

/**
 * Create a new project.
 * @param {string} outputDir - Base output directory
 * @param {Object} options - { name, folder, description, color, settings }
 * @returns {Object} - Created project
 */
function createProject(outputDir, { name, folder, description = '', color = '#14b8a6', settings = {} }) {
  if (!name || !name.trim()) {
    throw new Error('Project name is required');
  }

  if (!folder || !folder.trim()) {
    throw new Error('Project folder is required');
  }

  const data = loadProjects(outputDir);

  // Check for duplicate folder paths
  const normalizedFolder = path.normalize(folder);
  const existingByFolder = data.projects.find(p => p.folder && path.normalize(p.folder) === normalizedFolder);
  if (existingByFolder) {
    throw new Error('A project already exists in this folder');
  }

  const now = new Date().toISOString();
  const project = {
    id: generateProjectId(),
    name: name.trim(),
    folder: normalizedFolder,
    description: description.trim(),
    color,
    createdAt: now,
    updatedAt: now,
    settings: {
      siteUrl: settings.siteUrl || '',
      viewport: settings.viewport || { width: 1680, height: 950 },
      injectCSS: settings.injectCSS || false,
      customCSS: settings.customCSS || ''
    }
  };

  // Create project folder and project.json
  fs.mkdirSync(project.folder, { recursive: true });

  const projectJson = {
    projectId: project.id,
    recordings: []
  };
  fs.writeFileSync(path.join(project.folder, PROJECT_FILE), JSON.stringify(projectJson, null, 2));

  // Add to projects list
  data.projects.push(project);
  saveProjects(outputDir, data);

  return project;
}

/**
 * Update an existing project.
 * @param {string} outputDir - Base output directory
 * @param {string} projectId - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated project
 */
function updateProject(outputDir, projectId, updates) {
  const data = loadProjects(outputDir);
  const projectIndex = data.projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    throw new Error('Project not found');
  }

  const project = data.projects[projectIndex];

  // Apply updates
  if (updates.name !== undefined && updates.name.trim()) {
    project.name = updates.name.trim();
  }

  // Note: folder cannot be changed after creation (would break existing recordings)

  if (updates.description !== undefined) {
    project.description = updates.description.trim();
  }

  if (updates.color !== undefined) {
    project.color = updates.color;
  }

  if (updates.settings !== undefined) {
    project.settings = {
      ...project.settings,
      ...updates.settings
    };
  }

  project.updatedAt = new Date().toISOString();

  data.projects[projectIndex] = project;
  saveProjects(outputDir, data);

  return project;
}

/**
 * Delete a project and all its recordings.
 * @param {string} outputDir - Base output directory
 * @param {string} projectId - Project ID
 */
function deleteProject(outputDir, projectId) {
  const data = loadProjects(outputDir);
  const projectIndex = data.projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    throw new Error('Project not found');
  }

  const project = data.projects[projectIndex];
  const projectFolder = getProjectFolderPath(outputDir, project);

  // Delete project folder and all contents
  if (fs.existsSync(projectFolder)) {
    fs.rmSync(projectFolder, { recursive: true, force: true });
  }

  // Remove from projects list
  data.projects.splice(projectIndex, 1);

  // Clear lastOpenedProjectId if it was this project
  if (data.lastOpenedProjectId === projectId) {
    data.lastOpenedProjectId = null;
  }

  saveProjects(outputDir, data);
}

/**
 * Get a project by ID.
 * @param {string} outputDir - Base output directory
 * @param {string} projectId - Project ID
 * @returns {Object|null} - Project or null if not found
 */
function getProject(outputDir, projectId) {
  const data = loadProjects(outputDir);
  return data.projects.find(p => p.id === projectId) || null;
}

/**
 * Get recordings for a project.
 * @param {string} outputDir - Base output directory
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of recording metadata
 */
function getProjectRecordings(outputDir, projectId) {
  const data = loadProjects(outputDir);
  const project = data.projects.find(p => p.id === projectId);

  if (!project) {
    return [];
  }

  const projectFolder = getProjectFolderPath(outputDir, project);
  const projectJsonPath = path.join(projectFolder, PROJECT_FILE);

  if (fs.existsSync(projectJsonPath)) {
    try {
      const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
      return projectData.recordings || [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Add a recording to a project.
 * @param {string} outputDir - Base output directory
 * @param {string} projectId - Project ID
 * @param {Object} recording - Recording metadata
 */
function addRecordingToProject(outputDir, projectId, recording) {
  const data = loadProjects(outputDir);
  const project = data.projects.find(p => p.id === projectId);

  if (!project) {
    throw new Error('Project not found');
  }

  const projectFolder = getProjectFolderPath(outputDir, project);
  const projectJsonPath = path.join(projectFolder, PROJECT_FILE);

  let projectData = { projectId, recordings: [] };
  if (fs.existsSync(projectJsonPath)) {
    try {
      projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    } catch {
      // Use default
    }
  }

  // Add recording metadata
  projectData.recordings.unshift({
    id: recording.id,
    title: recording.title,
    url: recording.url,
    startTime: recording.startTime,
    endTime: new Date().toISOString(),
    actionCount: recording.actions?.length || 0,
    screenshotCount: recording.screenshots?.length || 0
  });

  // Keep only last 100 recordings in metadata
  projectData.recordings = projectData.recordings.slice(0, 100);

  fs.writeFileSync(projectJsonPath, JSON.stringify(projectData, null, 2));

  // Update project's updatedAt
  project.updatedAt = new Date().toISOString();
  const projectIndex = data.projects.findIndex(p => p.id === projectId);
  data.projects[projectIndex] = project;
  saveProjects(outputDir, data);
}

/**
 * Remove a recording from a project's metadata.
 * @param {string} outputDir - Base output directory
 * @param {string} projectId - Project ID
 * @param {string} recordingId - Recording ID
 */
function removeRecordingFromProject(outputDir, projectId, recordingId) {
  const data = loadProjects(outputDir);
  const project = data.projects.find(p => p.id === projectId);

  if (!project) {
    return;
  }

  const projectFolder = getProjectFolderPath(outputDir, project);
  const projectJsonPath = path.join(projectFolder, PROJECT_FILE);

  if (fs.existsSync(projectJsonPath)) {
    try {
      const projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
      projectData.recordings = (projectData.recordings || []).filter(r => r.id !== recordingId);
      fs.writeFileSync(projectJsonPath, JSON.stringify(projectData, null, 2));
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Move a recording from one project to another.
 * @param {string} outputDir - Base output directory
 * @param {string} recordingId - Recording ID
 * @param {string} fromProjectId - Source project ID
 * @param {string} toProjectId - Destination project ID
 */
function moveRecording(outputDir, recordingId, fromProjectId, toProjectId) {
  const data = loadProjects(outputDir);

  const fromProject = data.projects.find(p => p.id === fromProjectId);
  const toProject = data.projects.find(p => p.id === toProjectId);

  if (!fromProject || !toProject) {
    throw new Error('Project not found');
  }

  const fromFolder = getProjectFolderPath(outputDir, fromProject);
  const toFolder = getProjectFolderPath(outputDir, toProject);
  const recordingFolder = path.join(fromFolder, recordingId);
  const targetFolder = path.join(toFolder, recordingId);

  if (!fs.existsSync(recordingFolder)) {
    throw new Error('Recording not found');
  }

  // Get recording metadata before moving
  const fromProjectJsonPath = path.join(fromFolder, PROJECT_FILE);
  let recordingMetadata = null;

  if (fs.existsSync(fromProjectJsonPath)) {
    try {
      const fromData = JSON.parse(fs.readFileSync(fromProjectJsonPath, 'utf8'));
      recordingMetadata = (fromData.recordings || []).find(r => r.id === recordingId);
    } catch {
      // Ignore
    }
  }

  // Move the recording folder
  fs.renameSync(recordingFolder, targetFolder);

  // Update source project's metadata
  removeRecordingFromProject(outputDir, fromProjectId, recordingId);

  // Add to destination project's metadata
  if (recordingMetadata) {
    const toProjectJsonPath = path.join(toFolder, PROJECT_FILE);
    let toData = { projectId: toProjectId, recordings: [] };

    if (fs.existsSync(toProjectJsonPath)) {
      try {
        toData = JSON.parse(fs.readFileSync(toProjectJsonPath, 'utf8'));
      } catch {
        // Use default
      }
    }

    toData.recordings.unshift(recordingMetadata);
    fs.writeFileSync(toProjectJsonPath, JSON.stringify(toData, null, 2));
  }

  // Update both projects' updatedAt
  const now = new Date().toISOString();
  fromProject.updatedAt = now;
  toProject.updatedAt = now;
  saveProjects(outputDir, data);
}

/**
 * Get effective settings for a recording (merged with project defaults).
 * @param {Object} project - Project object
 * @param {Object} recording - Recording object with potential settingsOverride
 * @returns {Object} - Merged settings
 */
function getEffectiveSettings(project, recording) {
  const projectSettings = project.settings || {};
  const overrides = recording.settingsOverride || {};

  return {
    viewport: overrides.viewport && recording.viewport
      ? recording.viewport
      : projectSettings.viewport || { width: 1680, height: 950 },
    injectCSS: overrides.injectCSS !== undefined && recording.injectCSS !== undefined
      ? recording.injectCSS
      : projectSettings.injectCSS || false,
    customCSS: overrides.customCSS !== undefined && recording.customCSS !== undefined
      ? recording.customCSS
      : projectSettings.customCSS || ''
  };
}

/**
 * Set the last opened project ID.
 * @param {string} outputDir - Base output directory
 * @param {string|null} projectId - Project ID or null
 */
function setLastOpenedProject(outputDir, projectId) {
  const data = loadProjects(outputDir);
  data.lastOpenedProjectId = projectId;
  saveProjects(outputDir, data);
}

/**
 * Get recording folder path within a project.
 * @param {string} outputDir - Base output directory
 * @param {string|Object} projectOrName - Project object or project name (legacy)
 * @param {string} recordingId - Recording ID
 * @returns {string} - Recording folder path
 */
function getRecordingPath(outputDir, projectOrName, recordingId) {
  return path.join(getProjectFolderPath(outputDir, projectOrName), recordingId);
}

/**
 * Migrate existing recordings to a default project.
 * Called on first launch to handle legacy flat-structure recordings.
 * @param {string} outputDir - Base output directory
 * @returns {Object|null} - Created project if migration occurred, null otherwise
 */
function migrateExistingRecordings(outputDir) {
  // Check if projects.json already exists (not first launch)
  const projectsPath = path.join(outputDir, PROJECTS_FILE);
  if (fs.existsSync(projectsPath)) {
    return null;
  }

  // Check for existing history.json (old format)
  const historyPath = path.join(outputDir, 'history.json');
  if (!fs.existsSync(historyPath)) {
    return null;
  }

  try {
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    if (!Array.isArray(history) || history.length === 0) {
      return null;
    }

    // Create "Imported Recordings" project
    const importedFolder = path.join(outputDir, 'Imported Recordings');
    const project = createProject(outputDir, {
      name: 'Imported Recordings',
      folder: importedFolder,
      description: 'Recordings imported from previous version',
      color: '#6366f1'
    });

    const projectFolder = getProjectFolderPath(outputDir, project);

    // Move each recording folder into the project
    for (const recording of history) {
      const oldPath = path.join(outputDir, recording.id);
      const newPath = path.join(projectFolder, recording.id);

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    // Update project.json with recording metadata
    const projectJsonPath = path.join(projectFolder, PROJECT_FILE);
    const projectData = {
      projectId: project.id,
      recordings: history.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url,
        startTime: r.startTime,
        endTime: r.endTime,
        actionCount: r.actionCount || 0,
        screenshotCount: r.screenshotCount || 0
      }))
    };
    fs.writeFileSync(projectJsonPath, JSON.stringify(projectData, null, 2));

    // Remove old history.json
    fs.unlinkSync(historyPath);

    console.log(`Migrated ${history.length} recordings to "Imported Recordings" project`);
    return project;

  } catch (error) {
    console.error('Migration error:', error);
    return null;
  }
}

module.exports = {
  loadProjects,
  saveProjects,
  createProject,
  updateProject,
  deleteProject,
  getProject,
  getProjectRecordings,
  addRecordingToProject,
  removeRecordingFromProject,
  moveRecording,
  getEffectiveSettings,
  setLastOpenedProject,
  getProjectFolderPath,
  getRecordingPath,
  migrateExistingRecordings,
  sanitizeFolderName
};
