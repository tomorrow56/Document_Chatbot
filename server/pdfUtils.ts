import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

/**
 * Extract text from PDF file using MarkItDown library
 * MarkItDown provides better text extraction with structure preservation
 * and supports multiple file formats (PDF, Word, Excel, PowerPoint, etc.)
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  const tempDir = os.tmpdir();
  const scriptPath = path.join(tempDir, `markitdown_extract_${Date.now()}.py`);
  
  // Create Python script to extract text from PDF using MarkItDown
  const pythonScript = `
import sys
# Ensure MarkItDown can be found
sys.path.insert(0, '/usr/local/lib/python3.11/dist-packages')
from markitdown import MarkItDown

def extract_text(file_path):
    try:
        md = MarkItDown()
        result = md.convert(file_path)
        return result.text_content
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <file_path>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    text = extract_text(file_path)
    print(text)
`;

  try {
    // Write Python script to temp file
    await fs.writeFile(scriptPath, pythonScript);

    // Execute Python script with MarkItDown
    const { stdout, stderr } = await execAsync(
      `/usr/bin/python3 "${scriptPath}" "${pdfPath}"`
    );

    if (stderr && !stdout) {
      throw new Error(`MarkItDown extraction failed: ${stderr}`);
    }

    return stdout.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF using MarkItDown: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    // Clean up temp script file
    try {
      await fs.unlink(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Extract text from various document formats using MarkItDown
 * Supports: PDF, Word, Excel, PowerPoint, Images, HTML, and more
 */
export async function extractTextFromDocument(filePath: string): Promise<string> {
  const tempDir = os.tmpdir();
  const scriptPath = path.join(tempDir, `markitdown_extract_${Date.now()}.py`);
  
  const pythonScript = `
import sys
# Ensure MarkItDown can be found
sys.path.insert(0, '/usr/local/lib/python3.11/dist-packages')
from markitdown import MarkItDown

def extract_text(file_path):
    try:
        md = MarkItDown()
        result = md.convert(file_path)
        return result.text_content
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <file_path>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    text = extract_text(file_path)
    print(text)
`;

  try {
    await fs.writeFile(scriptPath, pythonScript);

    const { stdout, stderr } = await execAsync(
      `/usr/bin/python3 "${scriptPath}" "${filePath}"`
    );

    if (stderr && !stdout) {
      throw new Error(`MarkItDown extraction failed: ${stderr}`);
    }

    return stdout.trim();
  } catch (error) {
    throw new Error(
      `Failed to extract text from document using MarkItDown: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    try {
      await fs.unlink(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Check if a file is a PDF based on its extension
 */
export function isPDF(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

/**
 * Check if a file is a supported document format by MarkItDown
 * Supported formats: PDF, DOCX, PPTX, XLSX, XLS, HTML, and more
 */
export function isSupportedDocument(filename: string): boolean {
  const supportedExtensions = [
    '.pdf', '.docx', '.doc', '.pptx', '.ppt', 
    '.xlsx', '.xls', '.html', '.htm', '.txt', 
    '.md', '.csv', '.json', '.xml', '.zip'
  ];
  
  const lowerFilename = filename.toLowerCase();
  return supportedExtensions.some(ext => lowerFilename.endsWith(ext));
}

