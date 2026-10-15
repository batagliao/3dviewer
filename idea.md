I would like to make a 3d viewer desktop application that can open stl, obj, 3mf files and display them in a 3d space. 

## Requirements

- The application needs to be cross platform (windows, linux, mac)
- The application needs to be able to display the 3d model in a 3d space
- The application needs to be able to rotate, zoom, and pan the 3d model
- The application needs to be able to display the 3d model in a wireframe, solid, or textured mode


# Design/Layout

- The application should have a simple and clean interface
- The application should have a dark mode
- The application should have a light mode
- The application should have a responsive design
- The application should have a modern design
- The application will contain a 3d canvas to display the 3d model
- The application will contain a sidebar to the right to display the 3d model roperties
- The application will contain a toolbar to display the 3d model tools
- The application will contain a sidebar to the left to display a treeview with file system
  - This treeview should display folders and 3D files supported by the application
  - The treeview should be able to expand and collapse folders
  - The treeview should be able to select files. When a file is selected it should be loaded on the 3D canvas
- The application should contain a status bar to display the 3d model status


## Technology

- Should use Tauri
- Should use Rust
- Should use Svelte

## Features

- Open stl, obj, 3mf files
- Display the 3d model in a 3d space
- Rotate, zoom, and pan the 3d model
- Display the 3d model in a wireframe, solid, or textured mode
- Display the 3d model properties
- Display the 3d model tools
- Display the 3d model status
- Display a treeview with the filesystem to select the file

## Structure

- The code of the application should be in the src folder
- The application should have a modular architecture
- Each module should have its own tests
