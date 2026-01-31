/**
 * Solidity Code Analyzer
 * Uses Tree-sitter to parse Solidity code and extract contract metadata
 */

import Parser from 'tree-sitter';
import Solidity from 'tree-sitter-solidity';
import { logger } from '../utils/logger.js';
import { GitHubClient } from '../github/client.js';
import {
  RepositoryTree,
  RepositoryFile,
  RepositoryDirectory,
  SolidityContract,
  SolidityFunction,
  StateVariable,
  ContractType,
  SolidityAnalysisResult,
  DependencyGraph,
  DependencyEdge,
} from '../types/index.js';

const UPGRADEABLE_PATTERNS = [
  'Initializable',
  'UUPSUpgradeable',
  'TransparentUpgradeableProxy',
  'BeaconProxy',
  'initialize(',
  'upgradeTo(',
];

export class SolidityAnalyzer {
  private parser: Parser;
  private githubClient: GitHubClient;
  private owner: string = '';
  private repo: string = '';

  constructor(githubToken?: string) {
    this.parser = new Parser();
    this.parser.setLanguage(Solidity as any);
    this.githubClient = new GitHubClient(githubToken);
    logger.info('SolidityAnalyzer initialized with Tree-sitter');
  }

  async analyzeSolidity(repoTree: RepositoryTree): Promise<SolidityAnalysisResult> {
    logger.info({ repo: repoTree.metadata.fullName }, 'Starting Solidity analysis');

    // Extract owner and repo for file fetching
    this.owner = repoTree.metadata.owner;
    this.repo = repoTree.metadata.name;

    const contracts: SolidityContract[] = [];
    const parseErrors: Array<{ filePath: string; error: string }> = [];

    // Find all Solidity files
    const solidityFiles = this.findSolidityFiles(repoTree.root);
    logger.info({ count: solidityFiles.length }, 'Found Solidity files');

    // Parse each Solidity file
    for (const file of solidityFiles) {
      try {
        const fileContracts = await this.parseFile(file);
        contracts.push(...fileContracts);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ filePath: file.path, error: errorMsg }, 'Failed to parse file');
        parseErrors.push({ filePath: file.path, error: errorMsg });
      }
    }

    logger.info({ totalContracts: contracts.length }, 'Parsed all contracts');

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(contracts);

    // Identify entry points (deployable contracts)
    const entryPointContracts = this.identifyEntryPoints(contracts, dependencyGraph);

    // Identify upgradeable contracts
    const upgradeableContracts = contracts
      .filter((c) => c.usesUpgradeablePattern)
      .map((c) => c.name);

    // Calculate stats
    const stats = {
      totalContracts: contracts.length,
      abstractContracts: contracts.filter((c) => c.type === 'abstract').length,
      interfaces: contracts.filter((c) => c.type === 'interface').length,
      libraries: contracts.filter((c) => c.type === 'library').length,
      totalFunctions: contracts.reduce((sum, c) => sum + c.functions.length, 0),
      parseErrors: parseErrors.length,
    };

    logger.info({ stats }, 'Solidity analysis completed');

    return {
      contracts,
      dependencyGraph,
      entryPointContracts,
      upgradeableContracts,
      stats,
      parseErrors,
    };
  }

  private findSolidityFiles(dir: RepositoryDirectory): RepositoryFile[] {
    const files: RepositoryFile[] = [];

    // Add Solidity files from current directory
    files.push(...dir.files.filter((f) => f.type === 'solidity'));

    // Recursively search subdirectories
    for (const subdir of dir.subdirectories) {
      files.push(...this.findSolidityFiles(subdir));
    }

    return files;
  }

  private async parseFile(file: RepositoryFile): Promise<SolidityContract[]> {
    logger.debug({ filePath: file.path }, 'Parsing Solidity file');

    // Fetch file content from GitHub
    const content = await this.githubClient.getFileContent(
      this.owner,
      this.repo,
      file.path
    );

    // Parse with Tree-sitter
    const tree = this.parser.parse(content);

    if (!tree.rootNode) {
      throw new Error('Failed to parse AST');
    }

    const contracts: SolidityContract[] = [];

    // Extract imports
    const imports = this.extractImports(tree.rootNode, content);

    // Find all contract declarations
    const contractNodes = this.findNodesByType(tree.rootNode, [
      'contract_declaration',
      'interface_declaration',
      'library_declaration',
    ]);

    for (const node of contractNodes) {
      const contract = this.extractContract(node, file.path, content, imports);
      if (contract) {
        contracts.push(contract);
      }
    }

    return contracts;
  }

  private extractImports(rootNode: Parser.SyntaxNode, sourceCode: string): string[] {
    const imports: string[] = [];
    const importNodes = this.findNodesByType(rootNode, ['import_directive']);

    for (const node of importNodes) {
      const importText = sourceCode.slice(node.startIndex, node.endIndex);
      // Extract import path from various import formats
      const pathMatch = importText.match(/["']([^"']+)["']/);
      if (pathMatch) {
        imports.push(pathMatch[1]);
      }
    }

    return imports;
  }

  private extractContract(
    node: Parser.SyntaxNode,
    filePath: string,
    sourceCode: string,
    fileImports: string[]
  ): SolidityContract | null {
    // Determine contract type
    let type: ContractType = 'contract';
    if (node.type === 'interface_declaration') {
      type = 'interface';
    } else if (node.type === 'library_declaration') {
      type = 'library';
    } else {
      // Check if abstract
      const contractText = sourceCode.slice(node.startIndex, node.endIndex);
      if (contractText.startsWith('abstract ')) {
        type = 'abstract';
      }
    }

    // Extract contract name
    const nameNode = node.childForFieldName('name');
    if (!nameNode) {
      logger.warn({ nodeType: node.type }, 'Contract without name found');
      return null;
    }
    const name = sourceCode.slice(nameNode.startIndex, nameNode.endIndex);

    // Extract inheritance
    const inherits: string[] = [];
    const inheritanceNode = node.childForFieldName('inheritance');
    if (inheritanceNode) {
      const inheritanceNames = this.findNodesByType(inheritanceNode, ['identifier', 'user_defined_type']);
      for (const inhNode of inheritanceNames) {
        const inhName = sourceCode.slice(inhNode.startIndex, inhNode.endIndex);
        if (inhName && !inherits.includes(inhName)) {
          inherits.push(inhName);
        }
      }
    }

    // Extract functions
    const functions = this.extractFunctions(node, sourceCode);

    // Extract state variables
    const stateVariables = this.extractStateVariables(node, sourceCode);

    // Check for upgradeable patterns
    const contractText = sourceCode.slice(node.startIndex, node.endIndex);
    const usesUpgradeablePattern = UPGRADEABLE_PATTERNS.some((pattern) =>
      contractText.includes(pattern)
    );

    return {
      name,
      type,
      filePath,
      imports: fileImports,
      inherits,
      functions,
      stateVariables,
      usesUpgradeablePattern,
    };
  }

  private extractFunctions(
    contractNode: Parser.SyntaxNode,
    sourceCode: string
  ): SolidityFunction[] {
    const functions: SolidityFunction[] = [];
    const functionNodes = this.findNodesByType(contractNode, ['function_definition']);

    for (const node of functionNodes) {
      const nameNode = node.childForFieldName('name');
      if (!nameNode) continue;

      const name = sourceCode.slice(nameNode.startIndex, nameNode.endIndex);

      // Extract visibility
      let visibility: 'public' | 'external' | 'internal' | 'private' = 'public';
      const visibilityNode = this.findNodeByType(node, 'visibility');
      if (visibilityNode) {
        const visText = sourceCode.slice(visibilityNode.startIndex, visibilityNode.endIndex);
        if (visText === 'external' || visText === 'internal' || visText === 'private') {
          visibility = visText;
        }
      }

      // Only include public/external functions
      if (visibility !== 'public' && visibility !== 'external') {
        continue;
      }

      // Extract state mutability
      let stateMutability: 'pure' | 'view' | 'payable' | 'nonpayable' | undefined;
      const mutabilityNode = this.findNodeByType(node, 'state_mutability');
      if (mutabilityNode) {
        const mutText = sourceCode.slice(mutabilityNode.startIndex, mutabilityNode.endIndex);
        if (mutText === 'pure' || mutText === 'view' || mutText === 'payable') {
          stateMutability = mutText;
        }
      }

      // Extract parameters (simplified)
      const parameters: string[] = [];
      const paramNode = node.childForFieldName('parameters');
      if (paramNode) {
        const paramText = sourceCode.slice(paramNode.startIndex, paramNode.endIndex);
        // Simple extraction - just get parameter count
        const paramCount = (paramText.match(/,/g) || []).length + (paramText.trim().length > 2 ? 1 : 0);
        for (let i = 0; i < paramCount; i++) {
          parameters.push(`param${i}`);
        }
      }

      // Extract returns (simplified)
      const returns: string[] = [];
      const returnNode = node.childForFieldName('return_parameters');
      if (returnNode) {
        returns.push('returnValue');
      }

      functions.push({
        name,
        visibility,
        stateMutability,
        parameters,
        returns,
      });
    }

    return functions;
  }

  private extractStateVariables(
    contractNode: Parser.SyntaxNode,
    sourceCode: string
  ): StateVariable[] {
    const variables: StateVariable[] = [];
    const varNodes = this.findNodesByType(contractNode, ['state_variable_declaration']);

    for (const node of varNodes) {
      const nameNode = this.findNodeByType(node, 'identifier');
      if (!nameNode) continue;

      const name = sourceCode.slice(nameNode.startIndex, nameNode.endIndex);

      // Extract type (simplified)
      const typeNode = this.findNodeByType(node, 'type_name') || 
                       this.findNodeByType(node, 'user_defined_type') ||
                       this.findNodeByType(node, 'elementary_type_name');
      const type = typeNode 
        ? sourceCode.slice(typeNode.startIndex, typeNode.endIndex)
        : 'unknown';

      // Extract visibility
      let visibility: 'public' | 'internal' | 'private' = 'internal';
      const varText = sourceCode.slice(node.startIndex, node.endIndex);
      if (varText.includes(' public ')) visibility = 'public';
      else if (varText.includes(' private ')) visibility = 'private';

      // Check for constant/immutable
      const constant = varText.includes(' constant ');
      const immutable = varText.includes(' immutable ');

      variables.push({
        name,
        type,
        visibility,
        constant,
        immutable,
      });
    }

    return variables;
  }

  private findNodesByType(node: Parser.SyntaxNode, types: string[]): Parser.SyntaxNode[] {
    const results: Parser.SyntaxNode[] = [];

    if (types.includes(node.type)) {
      results.push(node);
    }

    for (const child of node.children) {
      results.push(...this.findNodesByType(child, types));
    }

    return results;
  }

  private findNodeByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
    if (node.type === type) {
      return node;
    }

    for (const child of node.children) {
      const found = this.findNodeByType(child, type);
      if (found) return found;
    }

    return null;
  }

  private buildDependencyGraph(contracts: SolidityContract[]): DependencyGraph {
    const nodes: string[] = [];
    const edges: DependencyEdge[] = [];

    // Add all contracts as nodes
    for (const contract of contracts) {
      if (!nodes.includes(contract.name)) {
        nodes.push(contract.name);
      }

      // Add import dependencies
      for (const importPath of contract.imports) {
        if (!nodes.includes(importPath)) {
          nodes.push(importPath);
        }
        edges.push({
          from: contract.name,
          to: importPath,
          type: 'import',
        });
      }

      // Add inheritance dependencies
      for (const parent of contract.inherits) {
        if (!nodes.includes(parent)) {
          nodes.push(parent);
        }
        edges.push({
          from: contract.name,
          to: parent,
          type: 'inheritance',
        });
      }
    }

    return { nodes, edges };
  }

  private identifyEntryPoints(
    contracts: SolidityContract[],
    graph: DependencyGraph
  ): string[] {
    // Entry points are concrete contracts (not abstract, interface, or library)
    // that are likely to be deployed
    const deployable = contracts.filter(
      (c) => c.type === 'contract' && !this.isOnlyInherited(c.name, graph)
    );

    return deployable.map((c) => c.name);
  }

  private isOnlyInherited(contractName: string, graph: DependencyGraph): boolean {
    // Check if contract is only used for inheritance (appears as 'to' in inheritance edges)
    const isInherited = graph.edges.some(
      (e) => e.to === contractName && e.type === 'inheritance'
    );
    const isInheriting = graph.edges.some(
      (e) => e.from === contractName && e.type === 'inheritance'
    );

    return isInherited && !isInheriting;
  }
}

export async function analyzeSolidityRepository(
  repoTree: RepositoryTree,
  githubToken?: string
): Promise<SolidityAnalysisResult> {
  const analyzer = new SolidityAnalyzer(githubToken);
  return analyzer.analyzeSolidity(repoTree);
}
