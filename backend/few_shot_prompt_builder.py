"""
Few-Shot Prompt Builder for Protein Function Prediction

This module builds few-shot prompts using Mol-Instructions examples
to enhance protein function predictions.
"""

from typing import List, Optional
from mol_instructions_loader import MolInstruction, MolInstructionsRegistry


class FewShotPromptBuilder:
    """
    Build few-shot prompts using Mol-Instructions examples.
    
    Constructs prompts in the format:
    [Example 1] + [Example 2] + ... + [User Query]
    """
    
    def __init__(self, registry: MolInstructionsRegistry):
        """
        Initialize the prompt builder.
        
        Args:
            registry: MolInstructionsRegistry instance with loaded instructions
        """
        self.registry = registry
        
    def build_prompt(
        self,
        task: str,
        query: str,
        n_examples: int = 3,
        include_task_description: bool = True,
        random_seed: Optional[int] = None
    ) -> str:
        """
        Build a few-shot prompt with examples from Mol-Instructions.
        
        Args:
            task: Task type (e.g., 'protein_function', 'catalytic_activity')
            query: User's query or instruction
            n_examples: Number of examples to include (default: 3, max: 5)
            include_task_description: Whether to include task description
            random_seed: Optional seed for reproducible example selection
            
        Returns:
            Formatted few-shot prompt string
        """
        # Limit examples to stay within token limits
        n_examples = min(n_examples, 5)
        
        # Get examples from registry
        examples = self.registry.get_examples(task, n=n_examples, random_seed=random_seed)
        
        if not examples:
            # No examples available, return query only
            return f"Instruction: {query}\nOutput:"
        
        # Build prompt parts
        prompt_parts = []
        
        # Optional task description
        if include_task_description:
            task_descriptions = {
                "protein_function": "Predict the biological function of a protein based on its sequence or description.",
                "catalytic_activity": "Predict the catalytic activity and enzymatic function of a protein.",
                "protein_design": "Design or modify protein sequences for specific functions.",
                "domain_motif": "Identify functional domains and motifs in protein sequences.",
                "general_function": "Provide general functional descriptions of proteins."
            }
            
            if task in task_descriptions:
                prompt_parts.append(f"Task: {task_descriptions[task]}\n")
        
        # Add examples
        for i, example in enumerate(examples, 1):
            prompt_parts.append(f"Example {i}:")
            prompt_parts.append(f"Instruction: {example.instruction}")
            
            if example.input:
                prompt_parts.append(f"Input: {example.input}")
            
            prompt_parts.append(f"Output: {example.output}")
            prompt_parts.append("")  # Empty line between examples
        
        # Add user query
        prompt_parts.append("Now, please answer the following:")
        prompt_parts.append(f"Instruction: {query}")
        prompt_parts.append("Output:")
        
        return "\n".join(prompt_parts)
    
    def build_prompt_with_context(
        self,
        task: str,
        query: str,
        context: str,
        n_examples: int = 3,
        random_seed: Optional[int] = None
    ) -> str:
        """
        Build a few-shot prompt with additional context (e.g., protein sequence).
        
        Args:
            task: Task type
            query: User's query
            context: Additional context (e.g., protein sequence, UniProt data)
            n_examples: Number of examples to include
            random_seed: Optional seed for reproducibility
            
        Returns:
            Formatted few-shot prompt with context
        """
        # Get examples
        examples = self.registry.get_examples(task, n=min(n_examples, 5), random_seed=random_seed)
        
        prompt_parts = []
        
        # Add examples
        for i, example in enumerate(examples, 1):
            prompt_parts.append(f"Example {i}:")
            prompt_parts.append(f"Instruction: {example.instruction}")
            
            if example.input:
                prompt_parts.append(f"Input: {example.input}")
            
            prompt_parts.append(f"Output: {example.output}")
            prompt_parts.append("")
        
        # Add user query with context
        prompt_parts.append("Now, please answer the following:")
        prompt_parts.append(f"Instruction: {query}")
        prompt_parts.append(f"Context: {context}")
        prompt_parts.append("Output:")
        
        return "\n".join(prompt_parts)
    
    def get_prompt_stats(self, prompt: str) -> dict:
        """
        Get statistics about a generated prompt.
        
        Args:
            prompt: Generated prompt string
            
        Returns:
            Dictionary with prompt statistics
        """
        lines = prompt.split('\n')
        words = prompt.split()
        
        # Rough token estimate (1 token ≈ 0.75 words)
        estimated_tokens = int(len(words) * 1.33)
        
        return {
            "total_lines": len(lines),
            "total_words": len(words),
            "total_characters": len(prompt),
            "estimated_tokens": estimated_tokens
        }


def create_protein_function_prompt(
    registry: MolInstructionsRegistry,
    protein_symbol: str,
    protein_name: str,
    sequence: Optional[str] = None,
    n_examples: int = 3
) -> str:
    """
    Create a few-shot prompt for protein function prediction.
    
    Args:
        registry: MolInstructionsRegistry instance
        protein_symbol: Protein gene symbol (e.g., 'APOE')
        protein_name: Full protein name
        sequence: Optional protein sequence
        n_examples: Number of examples to include
        
    Returns:
        Formatted prompt for protein function prediction
    """
    builder = FewShotPromptBuilder(registry)
    
    query = f"Predict the biological function and role in aging for the protein {protein_symbol} ({protein_name})."
    
    if sequence:
        # Truncate sequence if too long (keep first 200 amino acids)
        seq_preview = sequence[:200] + "..." if len(sequence) > 200 else sequence
        context = f"Protein: {protein_symbol}\nSequence: {seq_preview}"
        return builder.build_prompt_with_context(
            task="protein_function",
            query=query,
            context=context,
            n_examples=n_examples
        )
    else:
        return builder.build_prompt(
            task="protein_function",
            query=query,
            n_examples=n_examples
        )


if __name__ == "__main__":
    # Test the prompt builder
    print("Testing FewShotPromptBuilder...")
    print("=" * 60)
    
    from mol_instructions_loader import initialize_mol_instructions
    
    try:
        # Initialize registry
        registry = initialize_mol_instructions()
        
        # Create builder
        builder = FewShotPromptBuilder(registry)
        
        # Test prompt generation
        query = "What is the function of protein APOE in aging?"
        prompt = builder.build_prompt(
            task="protein_function",
            query=query,
            n_examples=2
        )
        
        print("\nGenerated Prompt:")
        print("-" * 60)
        print(prompt)
        print("-" * 60)
        
        # Get stats
        stats = builder.get_prompt_stats(prompt)
        print("\nPrompt Statistics:")
        for key, value in stats.items():
            print(f"  {key}: {value}")
        
        print("\n" + "=" * 60)
        print("✓ Test completed!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
