"""
Mol-Instructions Dataset Loader

This module loads and manages the Mol-Instructions dataset for few-shot learning
in protein function prediction tasks.
"""

import json
import random
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class MolInstruction:
    """Single instruction example from Mol-Instructions dataset"""
    instruction: str
    input: str
    output: str
    task: str


class MolInstructionsLoader:
    """
    Load and parse Mol-Instructions JSON files.
    
    The Mol-Instructions dataset contains 505K protein-oriented instructions
    across multiple task types for few-shot learning.
    """
    
    def __init__(self, data_dir: str = "data/raw/mol_instructions/Protein-oriented_Instructions"):
        """
        Initialize the loader.
        
        Args:
            data_dir: Path to the Mol-Instructions data directory
        """
        self.data_dir = Path(data_dir)
        self.task_files = {
            "protein_function": "protein_function.json",
            "catalytic_activity": "catalytic_activity.json",
            "protein_design": "protein_design.json",
            "domain_motif": "domain_motif.json",
            "general_function": "general_function.json"
        }
        
    def load_task(self, task: str) -> List[MolInstruction]:
        """
        Load instructions for a specific task.
        
        Args:
            task: Task name (e.g., 'protein_function', 'catalytic_activity')
            
        Returns:
            List of MolInstruction objects
            
        Raises:
            FileNotFoundError: If the task file doesn't exist
            ValueError: If the task is not recognized
        """
        if task not in self.task_files:
            raise ValueError(
                f"Unknown task '{task}'. Available tasks: {list(self.task_files.keys())}"
            )
        
        file_path = self.data_dir / self.task_files[task]
        
        if not file_path.exists():
            raise FileNotFoundError(
                f"Task file not found: {file_path}. "
                f"Please download the Mol-Instructions dataset first."
            )
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            instructions = []
            for item in data:
                instructions.append(MolInstruction(
                    instruction=item.get('instruction', ''),
                    input=item.get('input', ''),
                    output=item.get('output', ''),
                    task=task
                ))
            
            return instructions
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON file {file_path}: {e}")
        except Exception as e:
            raise RuntimeError(f"Error loading task '{task}': {e}")
    
    def load_all(self) -> Dict[str, List[MolInstruction]]:
        """
        Load all available task files.
        
        Returns:
            Dictionary mapping task names to lists of instructions
        """
        all_instructions = {}
        
        for task in self.task_files.keys():
            try:
                instructions = self.load_task(task)
                all_instructions[task] = instructions
                print(f"[MolInstructionsLoader] Loaded {len(instructions)} instructions for task '{task}'")
            except FileNotFoundError:
                print(f"[MolInstructionsLoader] Warning: Task file for '{task}' not found, skipping")
                all_instructions[task] = []
            except Exception as e:
                print(f"[MolInstructionsLoader] Error loading task '{task}': {e}")
                all_instructions[task] = []
        
        return all_instructions
    
    def get_available_tasks(self) -> List[str]:
        """
        Get list of available task types.
        
        Returns:
            List of task names
        """
        return list(self.task_files.keys())


class MolInstructionsRegistry:
    """
    In-memory registry of Mol-Instructions with indexing and sampling.
    
    Provides fast access to instruction examples for few-shot learning.
    """
    
    def __init__(self):
        """Initialize empty registry"""
        self.instructions_by_task: Dict[str, List[MolInstruction]] = {}
        self.total_count = 0
        
    def add_instructions(self, task: str, instructions: List[MolInstruction]):
        """
        Add instructions for a task to the registry.
        
        Args:
            task: Task name
            instructions: List of MolInstruction objects
        """
        self.instructions_by_task[task] = instructions
        self.total_count += len(instructions)
        print(f"[MolInstructionsRegistry] Added {len(instructions)} instructions for task '{task}'")
    
    def get_examples(self, task: str, n: int = 3, random_seed: Optional[int] = None) -> List[MolInstruction]:
        """
        Get N random examples for a task.
        
        Args:
            task: Task name
            n: Number of examples to retrieve
            random_seed: Optional seed for reproducibility
            
        Returns:
            List of MolInstruction objects (up to n examples)
        """
        if task not in self.instructions_by_task:
            return []
        
        instructions = self.instructions_by_task[task]
        
        if len(instructions) == 0:
            return []
        
        # Sample up to n examples
        sample_size = min(n, len(instructions))
        
        if random_seed is not None:
            random.seed(random_seed)
        
        return random.sample(instructions, sample_size)
    
    def get_statistics(self) -> Dict[str, int]:
        """
        Get instruction counts by task.
        
        Returns:
            Dictionary mapping task names to instruction counts
        """
        return {
            task: len(instructions)
            for task, instructions in self.instructions_by_task.items()
        }
    
    def get_all_tasks(self) -> List[str]:
        """
        Get list of all loaded tasks.
        
        Returns:
            List of task names
        """
        return list(self.instructions_by_task.keys())
    
    def is_task_loaded(self, task: str) -> bool:
        """
        Check if a task has been loaded.
        
        Args:
            task: Task name
            
        Returns:
            True if task is loaded and has instructions
        """
        return task in self.instructions_by_task and len(self.instructions_by_task[task]) > 0


# Global registry instance
_global_registry: Optional[MolInstructionsRegistry] = None


def get_global_registry() -> MolInstructionsRegistry:
    """
    Get or create the global MolInstructionsRegistry singleton.
    
    Returns:
        Global registry instance
    """
    global _global_registry
    if _global_registry is None:
        _global_registry = MolInstructionsRegistry()
    return _global_registry


def initialize_mol_instructions(data_dir: str = "data/raw/mol_instructions/Protein-oriented_Instructions") -> MolInstructionsRegistry:
    """
    Initialize and load Mol-Instructions dataset into global registry.
    
    Args:
        data_dir: Path to Mol-Instructions data directory
        
    Returns:
        Initialized registry
    """
    print("[MolInstructions] Initializing Mol-Instructions dataset...")
    
    loader = MolInstructionsLoader(data_dir)
    registry = get_global_registry()
    
    # Load all tasks
    all_instructions = loader.load_all()
    
    # Add to registry
    for task, instructions in all_instructions.items():
        if instructions:  # Only add if we have instructions
            registry.add_instructions(task, instructions)
    
    print(f"[MolInstructions] Loaded {registry.total_count} total instructions across {len(registry.get_all_tasks())} tasks")
    
    return registry


if __name__ == "__main__":
    # Test the loader
    print("Testing MolInstructionsLoader...")
    print("=" * 60)
    
    try:
        registry = initialize_mol_instructions()
        
        print("\nStatistics:")
        for task, count in registry.get_statistics().items():
            print(f"  {task}: {count} instructions")
        
        print("\nSample examples:")
        for task in registry.get_all_tasks():
            examples = registry.get_examples(task, n=1)
            if examples:
                ex = examples[0]
                print(f"\n  Task: {task}")
                print(f"  Instruction: {ex.instruction[:100]}...")
                print(f"  Input: {ex.input[:100]}...")
                print(f"  Output: {ex.output[:100]}...")
        
        print("\n" + "=" * 60)
        print("✓ Test completed!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nNote: Make sure Mol-Instructions dataset is downloaded to:")
        print("  data/raw/mol_instructions/Protein-oriented_Instructions/")
