import React, { useState, useEffect, useCallback, useRef } from 'react';

const ANIMATION_SPEED_MS = 25;

// Custom Button component
const Button = ({ onClick, disabled, children, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '8px 16px',
      backgroundColor: disabled ? '#ccc' : '#4299e1',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      margin: '0 4px',
    }}
    className={className}
  >
    {children}
  </button>
);

// Custom Select component
const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
    }}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const PathfindingVisualizer = () => {
  const [grid, setGrid] = useState([]);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [path, setPath] = useState([]);
  const [visitedNodes, setVisitedNodes] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [editMode, setEditMode] = useState('wall');
  const [algorithm, setAlgorithm] = useState('astar');
  const [mazeAlgorithm, setMazeAlgorithm] = useState('recursiveBacktracker');
  const [isMousePressed, setIsMousePressed] = useState(false);
  const [gridSize, setGridSize] = useState({ rows: 20, cols: 50 });
  const [cellSize, setCellSize] = useState(25);
  const [isGoalReached, setIsGoalReached] = useState(false);

  const gridRef = useRef(null);

  useEffect(() => {
    const updateGridSize = () => {
      if (gridRef.current) {
        const width = window.innerWidth * 0.9;
        const height = window.innerHeight * 0.7;
        const cols = ensureOdd(Math.floor(width / cellSize));
        const rows = ensureOdd(Math.floor(height / cellSize));
        setGridSize({ rows, cols });
      }
    };
  
    window.addEventListener('resize', updateGridSize);
    updateGridSize();
  
    return () => window.removeEventListener('resize', updateGridSize);
  }, [cellSize]);

  useEffect(() => {
    initializeGrid();
  }, [gridSize]);

  const initializeGrid = () => {
    const newGrid = [];
    for (let row = 0; row < gridSize.rows; row++) {
      const currentRow = [];
      for (let col = 0; col < gridSize.cols; col++) {
        currentRow.push({
          row,
          col,
          isStart: false,
          isEnd: false,
          isWall: false,
          f: Infinity,
          g: Infinity,
          h: Infinity,
          distance: Infinity,
          parent: null,
          visitedAt: -1,
        });
      }
      newGrid.push(currentRow);
    }
    const startPos = { row: 1, col: 1 };
    const endPos = { row: gridSize.rows - 2, col: gridSize.cols - 2 };
    newGrid[startPos.row][startPos.col].isStart = true;
    newGrid[endPos.row][endPos.col].isEnd = true;
    setGrid(newGrid);
    setStart(startPos);
    setEnd(endPos);
  };

  const getCellBackgroundColor = (cell) => {
    if (cell.isStart) return 'green';
    if (cell.isEnd) return 'red';
    if (cell.isWall) return 'black';
    // if (path.includes(cell)) return 'yellow';
    if (visitedNodes.includes(cell)) return getVisitedColor(cell.visitedAt, visitedNodes.length - 1);
    return 'white';
  };

  const handleCellInteraction = (row, col) => {
    if (isAnimating) return;
    const newGrid = [...grid];
  
    if (editMode === 'wall') {
      // Prevent adding walls on start or end positions
      if (!newGrid[row][col].isStart && !newGrid[row][col].isEnd) {
        newGrid[row][col].isWall = !newGrid[row][col].isWall;
      }
    } else if (editMode === 'start' && !newGrid[row][col].isEnd) {
      if (start) newGrid[start.row][start.col].isStart = false;
      newGrid[row][col].isStart = true;
      newGrid[row][col].isWall = false;  // Ensure the new start position is not a wall
      setStart({ row, col });
    } else if (editMode === 'end' && !newGrid[row][col].isStart) {
      if (end) newGrid[end.row][end.col].isEnd = false;
      newGrid[row][col].isEnd = true;
      newGrid[row][col].isWall = false;  // Ensure the new end position is not a wall
      setEnd({ row, col });
    }
  
    setGrid(newGrid);
    setPath([]);
    setVisitedNodes([]);
  };

  const handleMouseDown = (row, col) => {
    setIsMousePressed(true);
    handleCellInteraction(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (isMousePressed) {
      handleCellInteraction(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsMousePressed(false);
  };

  const manhattanDistance = (cell1, cell2) => {
    return Math.abs(cell1.row - cell2.row) + Math.abs(cell1.col - cell2.col);
  };

  const getNeighbors = (node, grid) => {
    const { row, col } = node;
    const neighbors = [];
    if (row > 0) neighbors.push(grid[row - 1][col]);
    if (row < gridSize.rows - 1) neighbors.push(grid[row + 1][col]);
    if (col > 0) neighbors.push(grid[row][col - 1]);
    if (col < gridSize.cols - 1) neighbors.push(grid[row][col + 1]);
    return neighbors.filter((neighbor) => !neighbor.isWall);
  };

  const astar = () => {
    const openSet = [grid[start.row][start.col]];
    const closedSet = [];
    let visitedAt = 0;

    grid[start.row][start.col].g = 0;
    grid[start.row][start.col].f = manhattanDistance(grid[start.row][start.col], grid[end.row][end.col]);

    while (openSet.length > 0) {
      let current = openSet[0];
      let currentIndex = 0;

      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < current.f) {
          current = openSet[i];
          currentIndex = i;
        }
      }

      if (current.row === end.row && current.col === end.col) {
        return { path: getPath(current), visited: closedSet };
      }

      openSet.splice(currentIndex, 1);
      current.visitedAt = visitedAt++;
      closedSet.push(current);

      const neighbors = getNeighbors(current, grid);
      for (let neighbor of neighbors) {
        if (closedSet.includes(neighbor)) continue;

        const tentativeG = current.g + 1;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tentativeG >= neighbor.g) {
          continue;
        }

        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = manhattanDistance(neighbor, grid[end.row][end.col]);
        neighbor.f = neighbor.g + neighbor.h;
      }
    }

    return { path: [], visited: closedSet };
  };

  const dijkstra = () => {
    const unvisited = grid.flat();
    const visited = [];
    let visitedAt = 0;

    grid[start.row][start.col].distance = 0;

    while (unvisited.length > 0) {
      unvisited.sort((a, b) => a.distance - b.distance);
      const current = unvisited.shift();

      if (current.distance === Infinity) break;

      current.visitedAt = visitedAt++;
      visited.push(current);

      if (current.row === end.row && current.col === end.col) {
        return { path: getPath(current), visited };
      }

      const neighbors = getNeighbors(current, grid);
      for (let neighbor of neighbors) {
        const distance = current.distance + 1;
        if (distance < neighbor.distance) {
          neighbor.distance = distance;
          neighbor.parent = current;
        }
      }
    }

    return { path: [], visited };
  };

  const bfs = () => {
    const queue = [grid[start.row][start.col]];
    const visited = [];
    let visitedAt = 0;

    grid[start.row][start.col].visitedAt = visitedAt++;

    while (queue.length > 0) {
      const current = queue.shift();
      visited.push(current);

      if (current.row === end.row && current.col === end.col) {
        return { path: getPath(current), visited };
      }

      const neighbors = getNeighbors(current, grid);
      for (let neighbor of neighbors) {
        if (neighbor.visitedAt === -1) {
          neighbor.visitedAt = visitedAt++;
          neighbor.parent = current;
          queue.push(neighbor);
        }
      }
    }

    return { path: [], visited };
  };

  const dfs = () => {
    const stack = [grid[start.row][start.col]];
    const visited = [];
    let visitedAt = 0;

    while (stack.length > 0) {
      const current = stack.pop();

      if (current.visitedAt === -1) {
        current.visitedAt = visitedAt++;
        visited.push(current);

        if (current.row === end.row && current.col === end.col) {
          return { path: getPath(current), visited };
        }

        const neighbors = getNeighbors(current, grid);
        for (let neighbor of neighbors) {
          if (neighbor.visitedAt === -1) {
            neighbor.parent = current;
            stack.push(neighbor);
          }
        }
      }
    }

    return { path: [], visited };
  };

  const getPath = (endNode) => {
    const path = [];
    let current = endNode;
    while (current !== null) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  };

  const runAlgorithm = useCallback(() => {
    if (!start || !end || isAnimating) return;
    setIsAnimating(true);
    setIsGoalReached(false);
    setPath([]);
    setVisitedNodes([]);

    let result;
    switch (algorithm) {
      case 'astar':
        result = astar();
        break;
      case 'bfs':
        result = bfs();
        break;
      case 'dfs':
        result = dfs();
        break;
      default:
        result = { path: [], visited: [] };
    }

    animateAlgorithm(result.visited, result.path);
  }, [grid, start, end, isAnimating, algorithm]);

  const animateAlgorithm = (visitedNodesInOrder, shortestPath) => {
    for (let i = 0; i <= visitedNodesInOrder.length; i++) {
      setTimeout(() => {
        if (i === visitedNodesInOrder.length) {
          setPath(shortestPath);
          setIsGoalReached(true);
          setIsAnimating(false);
        } else {
          const node = visitedNodesInOrder[i];
          setVisitedNodes(prev => [...prev, node]);
          /* if (node.parent) {
            setPath(getPath(node));
          } */
        }
      }, ANIMATION_SPEED_MS * i);
    }
  };

  const animateMaze = ({ grid: mazeGrid, sequence }) => {
    setIsAnimating(true);
    setGrid(grid.map(row => row.map(cell => ({ ...cell, isWall: true }))));
  
    for (let i = 0; i < sequence.length; i++) {
      setTimeout(() => {
        setGrid(prev => {
          const newGrid = prev.map(row => [...row]);
          const { row, col } = sequence[i];
          newGrid[row][col].isWall = false;
          return newGrid;
        });
        if (i === sequence.length - 1) {
          setIsAnimating(false);
        }
      }, 10 * i); // Adjust timing as needed
    }
  };

  const resetGrid = () => {
    if (isAnimating) return;
    initializeGrid();
    setPath([]);
    setVisitedNodes([]);
  };

  const clearPath = () => {
    if (isAnimating) return;
    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        visitedAt: -1,
        parent: null,
        f: Infinity,
        g: Infinity,
        h: Infinity,
        distance: Infinity,
      }))
    );
    setGrid(newGrid);
    setPath([]);
    setVisitedNodes([]);
  };

  const handleAlgorithmChange = (newAlgorithm) => {
    setAlgorithm(newAlgorithm);
    clearPath();
  };
  
  const generateMaze = () => {
    if (isAnimating || !start || !end) return;
  
    let mazeData;
    switch (mazeAlgorithm) {
      case 'recursiveBacktracker':
        mazeData = recursiveBacktrackerMaze();
        break;
      case 'prim':
        mazeData = primMaze();
        break;
      case 'kruskal':
        mazeData = kruskalMaze();
        break;
      default:
        mazeData = recursiveBacktrackerMaze();
    }
  
    setPath([]);
    setVisitedNodes([]);
    animateMaze(mazeData);
  };

  const recursiveBacktrackerMaze = () => {
    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        isWall: true,
        visited: false,
      }))
    );
  
    const wallRemovalSequence = [];
    const stack = [{ row: 1, col: 1 }];
  
    const getUnvisitedNeighbors = (row, col) => {
      const neighbors = [];
      if (row > 2) neighbors.push({ row: row - 2, col, direction: 'up' });
      if (row < gridSize.rows - 3) neighbors.push({ row: row + 2, col, direction: 'down' });
      if (col > 2) neighbors.push({ row, col: col - 2, direction: 'left' });
      if (col < gridSize.cols - 3) neighbors.push({ row, col: col + 2, direction: 'right' });
      return neighbors.filter(n => !newGrid[n.row][n.col].visited);
    };
  
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      newGrid[current.row][current.col].visited = true;
      newGrid[current.row][current.col].isWall = false;
      wallRemovalSequence.push({ row: current.row, col: current.col });
  
      const unvisitedNeighbors = getUnvisitedNeighbors(current.row, current.col);
  
      if (unvisitedNeighbors.length > 0) {
        const { row, col, direction } = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
        const wallRow = direction === 'up' ? current.row - 1 : direction === 'down' ? current.row + 1 : current.row;
        const wallCol = direction === 'left' ? current.col - 1 : direction === 'right' ? current.col + 1 : current.col;
        
        newGrid[wallRow][wallCol].isWall = false;
        wallRemovalSequence.push({ row: wallRow, col: wallCol });
        
        stack.push({ row, col });
      } else {
        stack.pop();
      }
    }
  
    // Ensure start and end are not walls
    newGrid[start.row][start.col].isWall = false;
    newGrid[end.row][end.col].isWall = false;
    wallRemovalSequence.push({ row: start.row, col: start.col });
    wallRemovalSequence.push({ row: end.row, col: end.col });
  
    return { grid: newGrid, sequence: wallRemovalSequence };
  };

  const primMaze = () => {
    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        isWall: true,
        visitedAt: -1,
      }))
    );
  
    const wallsList = [];
    const startCell = { row: 1, col: 1 };
    newGrid[startCell.row][startCell.col].isWall = false;
  
    const addWallsToFrontier = (row, col) => {
      [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dr, dc]) => {
        const newRow = row + 2 * dr;
        const newCol = col + 2 * dc;
        if (newRow > 0 && newRow < gridSize.rows - 1 && newCol > 0 && newCol < gridSize.cols - 1) {
          wallsList.push({ row: row + dr, col: col + dc, fromRow: row, fromCol: col });
        }
      });
    };
  
    addWallsToFrontier(startCell.row, startCell.col);
  
    const wallRemovalSequence = [];
  
    while (wallsList.length > 0) {
      const wallIndex = Math.floor(Math.random() * wallsList.length);
      const { row, col, fromRow, fromCol } = wallsList[wallIndex];
      wallsList.splice(wallIndex, 1);
  
      const toRow = row + (row - fromRow);
      const toCol = col + (col - fromCol);
  
      if (newGrid[toRow][toCol].isWall) {
        newGrid[row][col].isWall = false;
        newGrid[toRow][toCol].isWall = false;
        wallRemovalSequence.push({ row, col });
        wallRemovalSequence.push({ row: toRow, col: toCol });
        addWallsToFrontier(toRow, toCol);
      }
    }
  
    // Ensure start and end are not walls
    newGrid[start.row][start.col].isWall = false;
    newGrid[end.row][end.col].isWall = false;
  
    // Add start and end to the wall removal sequence to ensure they're animated
    wallRemovalSequence.push({ row: start.row, col: start.col });
    wallRemovalSequence.push({ row: end.row, col: end.col });
  
    return { grid: newGrid, sequence: wallRemovalSequence };
  };

  const kruskalMaze = () => {
    const newGrid = grid.map(row =>
      row.map(cell => ({
        ...cell,
        isWall: true,
        set: null,
      }))
    );
  
    const wallRemovalSequence = [];
  
    // Initialize each cell as its own set
    for (let row = 1; row < gridSize.rows - 1; row += 2) {
      for (let col = 1; col < gridSize.cols - 1; col += 2) {
        newGrid[row][col].isWall = false;
        newGrid[row][col].set = `${row},${col}`;
        wallRemovalSequence.push({ row, col });
      }
    }
  
    const walls = [];
    for (let row = 1; row < gridSize.rows - 1; row += 2) {
      for (let col = 1; col < gridSize.cols - 1; col += 2) {
        if (row + 2 < gridSize.rows - 1) walls.push([row + 1, col, 'v']);
        if (col + 2 < gridSize.cols - 1) walls.push([row, col + 1, 'h']);
      }
    }
  
    const findSet = (cell) => {
      if (cell.set === `${cell.row},${cell.col}`) return cell.set;
      const [parentRow, parentCol] = cell.set.split(',').map(Number);
      return findSet(newGrid[parentRow][parentCol]);
    };
    
    const unionSets = (cell1, cell2) => {
      const set1 = findSet(cell1);
      const set2 = findSet(cell2);
      if (set1 !== set2) {
        const [row, col] = set2.split(',').map(Number);
        newGrid[row][col].set = set1;
      }
    };
  
    while (walls.length > 0) {
      const index = Math.floor(Math.random() * walls.length);
      const [row, col, direction] = walls[index];
      walls.splice(index, 1);
  
      const cell1 = direction === 'h' ? newGrid[row][col - 1] : newGrid[row - 1][col];
      const cell2 = direction === 'h' ? newGrid[row][col + 1] : newGrid[row + 1][col];
  
      if (findSet(cell1) !== findSet(cell2)) {
        newGrid[row][col].isWall = false;
        wallRemovalSequence.push({ row, col });
        unionSets(cell1, cell2);
      }
    }
  
    // Ensure start and end are not walls
    newGrid[start.row][start.col].isWall = false;
    newGrid[end.row][end.col].isWall = false;
    wallRemovalSequence.push({ row: start.row, col: start.col });
    wallRemovalSequence.push({ row: end.row, col: end.col });
  
    return { grid: newGrid, sequence: wallRemovalSequence };
  };

  const getUnvisitedNeighbors = (cell, grid, visited) => {
    const { row, col } = cell;
    const neighbors = [];
    if (row > 1 && !visited.has(`${row - 2},${col}`)) neighbors.push({ row: row - 2, col });
    if (row < gridSize.rows - 2 && !visited.has(`${row + 2},${col}`)) neighbors.push({ row: row + 2, col });
    if (col > 1 && !visited.has(`${row},${col - 2}`)) neighbors.push({ row, col: col - 2 });
    if (col < gridSize.cols - 2 && !visited.has(`${row},${col + 2}`)) neighbors.push({ row, col: col + 2 });
    return neighbors.filter((n) => !(n.row === end.row && n.col === end.col));
  };

  const findPathToEnd = (grid, start, end) => {
    const queue = [start];
    const visited = new Set([`${start.row},${start.col}`]);
    const parentMap = new Map();

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.row === end.row && current.col === end.col) {
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.unshift(node);
          node = parentMap.get(`${node.row},${node.col}`);
        }
        return path;
      }

      const neighbors = getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const key = `${neighbor.row},${neighbor.col}`;
        if (!visited.has(key)) {
          visited.add(key);
          parentMap.set(key, current);
          queue.push(neighbor);
        }
      }
    }

    return []; // No path found
  };
  
  const getVisitedColor = (visitedAt, maxVisitedAt) => {
    const ratio = visitedAt / maxVisitedAt;
    const hue = 240 - ratio * 180; // This will go from blue (240) to yellow (60)
    return `hsl(${hue}, 100%, 50%)`;
  };  

  /* const getVisitedColor = (visitedAt, maxVisitedAt) => {
    const ratio = visitedAt / maxVisitedAt;
    const r = Math.floor(135 + (200 - 135) * ratio);
    const g = Math.floor(206 + (200 - 206) * ratio);
    const b = Math.floor(235 + (200 - 235) * ratio);
    return `rgb(${r},${g},${b})`;
  }; */

  // Add this function to ensure odd numbers
  const ensureOdd = (num) => (num % 2 === 0 ? num + 1 : num);

  const handleGridSizeChange = (event) => {
    const { name, value } = event.target;
    const newValue = ensureOdd(parseInt(value));
    setGridSize(prev => ({ ...prev, [name]: newValue }));
  };

  const handleCellSizeChange = (event) => {
    setCellSize(parseInt(event.target.value));
  };

  const getAlgorithmExplanation = (algo) => {
    switch (algo) {
      case 'astar':
        return "A* is an informed search algorithm that combines features of Dijkstra's algorithm and greedy best-first search. In searching this maze it uses a heuristic function (Manhattan distance) to estimate the cost from any cell to the goal. It maintains two values for each cell: g(n) (the cost to reach the cell) and h(n) (the estimated cost from the cell to the goal). It selects the next cell to explore based on f(n) = g(n) + h(n), balancing the known path cost and the estimated remaining cost. A* is very fast and guarantees the shortest path if the heuristic is admissible.";
      case 'bfs':
        return "BFS explores all neighbor cells at the present depth before moving to cells at the next depth level. It essentially is like spilling water from one source and seeing it spread. In maze pathfinding: It uses a queue to keep track of cells to visit. It explores cells in order of their distance from the start. It guarantees the shortest path in unweighted mazes like this one. It is the best option when there is no nowledge of the finish location";
      case 'dfs':
        return "DFS explores as far as possible along each branch before backtracking. In maze pathfinding: It uses a stack to keep track of cells to visit. It explores one possible path to its full extent before backtracking. It does not guarantee the shortest path making it a poor choice.";
      default:
        return "";
    }
  };

  const getMazeAlgorithmExplanation = (algo) => {
    switch (algo) {
      case 'recursiveBacktracker':
        return "The Recursive Backtracker algorithm creates mazes with long, winding passages: It starts at a random cell and marks it as visited. It chooses a random unvisited neighbor, moves to it, and removes the wall between them. It continues this process until it reaches a dead end (a cell with no unvisited neighbors). When it reaches a dead end, it backtracks to the last cell with unvisited neighbors and continues from there. This process continues until all cells have been visited. Recursive Backtracker tends to create mazes with long, winding passages and relatively few dead ends.";
      case 'prim':
        return "Prim's algorithm generates a maze by creating a minimum spanning tree: It starts with a grid of walls. It chooses a starting cell and marks it as part of the maze. It adds the walls of the current cell to a list of candidates. It repeatedly chooses a random wall from the candidates, and if the cell on the other side isn't in the maze yet, it removes the wall and adds the new cell to the maze. This process continues until all cells are part of the maze. Prim's algorithm tends to create mazes with a more "organic" appearance and shorter dead ends.";
      case 'kruskal':
        return "Kruskal's algorithm generates a maze by creating a minimum spanning tree: It starts with a grid where each cell is in its own set. It creates a list of all walls. It repeatedly chooses a random wall. If the cells on either side of the wall are in different sets, it removes the wall and merges the sets. This continues until all cells are in the same set. Kruskal's algorithm tends to produce mazes with many short dead ends and a more uniform structure.";
      default:
        return "";
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>Pathfinding Algorithm Visualizer</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '30%' }}>
          <h3 style={{ marginBottom: '10px' }}>Search Algorithm</h3>
          <Select
            value={algorithm}
            onChange={handleAlgorithmChange}
            options={[
              { value: 'astar', label: 'A* Search' },
              { value: 'bfs', label: 'Breadth-First Search' },
              { value: 'dfs', label: 'Depth-First Search' },
            ]}
          />
          <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', height: '100px', overflow: 'auto', fontSize: '14px' }}>
            {getAlgorithmExplanation(algorithm)}
          </div>
        </div>
  
        <div style={{ display: 'flex', flexDirection: 'column', width: '30%' }}>
          <h3 style={{ marginBottom: '10px' }}>Maze Generation</h3>
          <Select
            value={mazeAlgorithm}
            onChange={setMazeAlgorithm}
            options={[
              { value: 'recursiveBacktracker', label: 'Recursive Backtracker' },
              { value: 'prim', label: 'Prim\'s Algorithm' },
              { value: 'kruskal', label: 'Kruskal\'s Algorithm' },
            ]}
          />
          <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', height: '100px', overflow: 'auto', fontSize: '14px' }}>
            {getMazeAlgorithmExplanation(mazeAlgorithm)}
          </div>
        </div>
  
        <div style={{ display: 'flex', flexDirection: 'column', width: '30%' }}>
          <h3 style={{ marginBottom: '10px' }}>Grid Settings</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ marginRight: '10px' }}>
              Rows:
              <input
                type="number"
                name="rows"
                value={gridSize.rows}
                onChange={handleGridSizeChange}
                min="5"
                max="51"
                step="2"
                style={{ width: '50px', marginLeft: '5px' }}
              />
            </label>
            <label>
              Columns:
              <input
                type="number"
                name="cols"
                value={gridSize.cols}
                onChange={handleGridSizeChange}
                min="5"
                max="101"
                step="2"
                style={{ width: '50px', marginLeft: '5px' }}
              />
            </label>
          </div>
          <label>
            Cell Size:
            <input
              type="number"
              value={cellSize}
              onChange={handleCellSizeChange}
              min="10"
              max="50"
              style={{ width: '50px', marginLeft: '5px' }}
            />
          </label>
        </div>
      </div>
  
      <div style={{ marginBottom: '20px' }}>
        <Button onClick={runAlgorithm} disabled={isAnimating}>Start Search</Button>
        <Button onClick={resetGrid} disabled={isAnimating}>Reset Grid</Button>
        <Button onClick={clearPath} disabled={isAnimating}>Clear Path</Button>
        <Button onClick={generateMaze} disabled={isAnimating}>Generate Maze</Button>
      </div>
  
      <div style={{ marginBottom: '20px' }}>
        <Button
          onClick={() => setEditMode('wall')}
          style={{ backgroundColor: editMode === 'wall' ? '#2b6cb0' : '#4299e1' }}
        >
          Edit Walls
        </Button>
        <Button
          onClick={() => setEditMode('start')}
          style={{ backgroundColor: editMode === 'start' ? '#2b6cb0' : '#4299e1' }}
        >
          Move Start
        </Button>
        <Button
          onClick={() => setEditMode('end')}
          style={{ backgroundColor: editMode === 'end' ? '#2b6cb0' : '#4299e1' }}
        >
          Move End
        </Button>
      </div>
  
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize.cols}, ${cellSize}px)`,
            gap: '1px',
            backgroundColor: '#ccc',
            border: '2px solid #333',
            borderRadius: '4px',
            position: 'relative',
            marginBottom: '20px',
          }}
          onMouseLeave={handleMouseUp}
        >
          {isGoalReached && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1,
            }} />
          )}
  
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: getCellBackgroundColor(cell),
                  border: '1px solid #ccc',
                  transition: 'background-color 0.3s ease',
                  position: 'relative',
                  zIndex: 2,
                }}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                onMouseUp={handleMouseUp}
              >
                {isGoalReached && path.includes(cell) && !cell.isStart && !cell.isEnd && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'magenta',
                      zIndex: 3,
                    }}
                  />
                )}
                {cell.isStart && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'green',
                      zIndex: 4,
                    }}
                  />
                )}
                {cell.isEnd && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'red',
                      zIndex: 4,
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>
  
        <div style={{ marginTop: '20px', fontSize: '14px', textAlign: 'center' }}>
          <p>Use the buttons above to edit walls, move start/end points, or generate a new maze.</p>
          <p>Click and drag to add/remove walls quickly.</p>
          <p>Select an algorithm and click "Start Search" to visualize the pathfinding process.</p>
        </div>
      </div>
    </div>
  );
}

export default PathfindingVisualizer;
