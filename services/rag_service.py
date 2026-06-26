# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

import os
import json
import re
import math
from typing import List, Dict, Any, Optional

class RagService:
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Lowercases, cleans punctuation, and splits text into individual word tokens."""
        cleaned = re.sub(r'[^\w\s]', '', text.lower())
        return cleaned.split()

    @staticmethod
    def _retrieve_from_documents(query: str, documents: List[Dict[str, Any]], k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves the top k most relevant documents from a custom document list
        using pure-Python TF-IDF cosine similarity.
        """
        if not documents:
            return []

        # Tokenize documents and query
        doc_tokens = []
        for doc in documents:
            # Combine title, category, and content for a richer text profile
            text = f"{doc.get('title', '')} {doc.get('category', '')} {doc.get('content', '')}"
            doc_tokens.append(RagService._tokenize(text))
            
        query_tokens = RagService._tokenize(query)
        if not query_tokens:
            return documents[:k] # Return fallback list if query is empty

        # Gather vocab mapping
        vocab = set()
        for tokens in doc_tokens:
            vocab.update(tokens)
        vocab.update(query_tokens)
        vocab = list(vocab)
        vocab_index = {word: idx for idx, word in enumerate(vocab)}

        # Compute IDF
        num_docs = len(documents)
        df = {word: 0 for word in vocab}
        for tokens in doc_tokens:
            unique_tokens = set(tokens)
            for token in unique_tokens:
                if token in df:
                    df[token] += 1
                    
        idf = {}
        for word in vocab:
            # Smooth IDF to prevent zero division
            idf[word] = math.log((1 + num_docs) / (1 + df[word])) + 1.0

        # Vectorize documents
        doc_vectors = []
        for tokens in doc_tokens:
            vector = [0.0] * len(vocab)
            tf = {}
            for token in tokens:
                tf[token] = tf.get(token, 0) + 1
            for token, count in tf.items():
                if token in vocab_index:
                    idx = vocab_index[token]
                    vector[idx] = count * idf[token]
            doc_vectors.append(vector)

        # Vectorize query
        query_vector = [0.0] * len(vocab)
        q_tf = {}
        for token in query_tokens:
            q_tf[token] = q_tf.get(token, 0) + 1
        for token, count in q_tf.items():
            if token in vocab_index:
                idx = vocab_index[token]
                query_vector[idx] = count * idf[token]

        # Helper methods to calculate Cosine Similarity
        def dot_product(v1, v2):
            return sum(x * y for x, y in zip(v1, v2))

        def magnitude(v):
            return math.sqrt(sum(x * x for x in v))

        query_mag = magnitude(query_vector)
        
        scores = []
        for doc_idx, doc_vec in enumerate(doc_vectors):
            doc_mag = magnitude(doc_vec)
            if query_mag == 0.0 or doc_mag == 0.0:
                sim = 0.0
            else:
                sim = dot_product(query_vector, doc_vec) / (query_mag * doc_mag)
            scores.append((sim, doc_idx))

        # Sort by similarity score descending
        scores.sort(key=lambda x: x[0], reverse=True)

        # Retrieve top k documents
        results = []
        for score, idx in scores[:k]:
            doc_copy = documents[idx].copy()
            doc_copy["similarityScore"] = round(score, 3)
            results.append(doc_copy)

        return results

    @staticmethod
    def retrieve(query: str, k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves the top k most relevant guidelines from guidelines_kb.json
        using a pure-Python TF-IDF cosine similarity search.
        """
        kb_path = os.path.join(os.path.dirname(__file__), "guidelines_kb.json")
        if not os.path.exists(kb_path):
            print(f"[RAG Warning] Knowledge base file not found at: {kb_path}")
            return []
            
        try:
            with open(kb_path, "r", encoding="utf-8") as f:
                documents = json.load(f)
        except Exception as e:
            print(f"[RAG Error] Failed to read knowledge base: {e}")
            return []
            
        results = RagService._retrieve_from_documents(query, documents, k)
        print(f"[RAG] Retrieved {len(results)} matches for query: '{query}'")
        return results

    @staticmethod
    def chunk_report_data(report: Any, html_content: str) -> List[Dict[str, Any]]:
        """
        Slices the full crawled HTML, DOM elements, simulated console warnings, and audit lists into small chunks.
        """
        chunks = []
        
        # 1. Chunk from HTML text using BeautifulSoup
        if html_content:
            try:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html_content, "html.parser")
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                    
                text = soup.get_text(separator=" ")
                # Clean up multiple whitespaces
                text = re.sub(r'\s+', ' ', text).strip()
                
                # Split text into chunks of ~400 characters with 100 character overlap
                words = text.split()
                chunk_words = []
                current_len = 0
                for word in words:
                    chunk_words.append(word)
                    current_len += len(word) + 1
                    if current_len >= 400:
                        chunks.append({
                            "title": "Crawled Page HTML Content Chunk",
                            "category": "HTML Text",
                            "content": " ".join(chunk_words)
                        })
                        # Overlap: keep last 10 words
                        chunk_words = chunk_words[-10:]
                        current_len = sum(len(w) + 1 for w in chunk_words)
                if chunk_words:
                    chunks.append({
                        "title": "Crawled Page HTML Content Chunk",
                        "category": "HTML Text",
                        "content": " ".join(chunk_words)
                    })
                
                # Extract DOM elements
                # Mobile viewport meta tag
                viewport_tag = soup.find("meta", attrs={"name": "viewport"})
                if viewport_tag:
                    chunks.append({
                        "title": "DOM Element: Mobile Viewport Meta Tag",
                        "category": "DOM Header",
                        "content": f"The page has a mobile viewport declaration: {str(viewport_tag)}."
                    })
                else:
                    chunks.append({
                        "title": "DOM Element: Mobile Viewport Meta Tag",
                        "category": "DOM Header",
                        "content": "The page is missing a `<meta name='viewport'>` tag, which will cause mobile responsive errors."
                    })

                # Title tag
                title_tag = soup.find("title")
                if title_tag:
                    chunks.append({
                        "title": "DOM Element: Title Tag",
                        "category": "DOM Header",
                        "content": f"The page title tag is set to: '{title_tag.get_text().strip()}'."
                    })

                # Heading tags H1, H2, H3
                h1_tags = soup.find_all("h1")
                for idx, h in enumerate(h1_tags):
                    chunks.append({
                        "title": f"DOM Element: H1 Heading Tag #{idx+1}",
                        "category": "DOM Heading",
                        "content": f"H1 heading tag text: '{h.get_text().strip()}'"
                    })

                # Image tags and alt texts
                images = soup.find_all("img")
                for idx, img in enumerate(images[:20]): # Limit to first 20 images to avoid chunk overload
                    alt = img.get("alt")
                    src = img.get("src", "")
                    if not alt or alt.strip() == "":
                        chunks.append({
                            "title": "DOM Element: Image Missing Alt Text",
                            "category": "DOM Image",
                            "content": f"Accessibility flaw: Image #{idx+1} with source url '{src}' does not have an 'alt' attribute description."
                        })
                    else:
                        chunks.append({
                            "title": "DOM Element: Image Alt Text",
                            "category": "DOM Image",
                            "content": f"Image #{idx+1} with source url '{src}' has alt text: '{alt}'"
                        })
            except Exception as e:
                print(f"[RAG Warning] Failed parsing DOM and HTML elements: {e}")

        # 2. Chunk from Console Warnings
        if hasattr(report, 'metrics') and report.metrics and hasattr(report.metrics, 'consoleErrorsSimulated') and report.metrics.consoleErrorsSimulated:
            for idx, log in enumerate(report.metrics.consoleErrorsSimulated):
                chunks.append({
                    "title": f"Console Warning Log #{idx+1}",
                    "category": "Console Logs",
                    "content": f"Browser console diagnostic message: {log}"
                })

        # 3. Chunk from Broken Links
        if hasattr(report, 'metrics') and report.metrics and hasattr(report.metrics, 'brokenLinks') and report.metrics.brokenLinks:
            for idx, b in enumerate(report.metrics.brokenLinks):
                chunks.append({
                    "title": f"Broken Link Reference #{idx+1}",
                    "category": "Broken Links List",
                    "content": f"Broken link found on page pointing to '{b.url}' returned status code {b.statusCode} ({b.errorDescription})."
                })

        # 4. Chunk from Redirect Chain
        if hasattr(report, 'redirectChain') and report.redirectChain:
            chain_steps = []
            for idx, step in enumerate(report.redirectChain):
                chain_steps.append(f"Step {idx+1}: {step.url} (Status {step.statusCode}, {step.redirectType})")
            chunks.append({
                "title": "Redirect Sequence Chain",
                "category": "Redirect Chain",
                "content": "Web page redirect path chain mapping: " + " -> ".join(chain_steps)
            })

        # 5. Chunk from Metadata Recommendations
        if hasattr(report, 'metrics') and report.metrics and hasattr(report.metrics, 'metaDataAnalysis') and report.metrics.metaDataAnalysis:
            meta = report.metrics.metaDataAnalysis
            if meta.titleRecommendations:
                chunks.append({
                    "title": "Page Title Audit Recommendation",
                    "category": "SEO Audit Recommendations",
                    "content": f"Title Tag Audit: length is {meta.titleLength} chars. Status is {meta.titleStatus}. Recommendations: " + " ".join(meta.titleRecommendations)
                })
            if meta.metaDescriptionRecommendations:
                chunks.append({
                    "title": "Meta Description Audit Recommendation",
                    "category": "SEO Audit Recommendations",
                    "content": f"Meta Description Audit: length is {meta.metaDescriptionLength} chars. Status is {meta.metaDescriptionStatus}. Recommendations: " + " ".join(meta.metaDescriptionRecommendations)
                })

        return chunks

    @staticmethod
    def retrieve_report_chunks(query: str, audit_id: str, report: Any, k: int = 3) -> List[Dict[str, Any]]:
        """
        Loads the crawled HTML file from html_store/{audit_id}.html, slices it and other
        audit logs into chunks, and returns the top k relevant chunks matching the query.
        """
        html_content = ""
        html_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "html_store")
        html_path = os.path.join(html_dir, f"{audit_id}.html")
        if os.path.exists(html_path):
            try:
                with open(html_path, "r", encoding="utf-8") as f:
                    html_content = f.read()
            except Exception as e:
                print(f"[RAG Error] Failed to read html crawl file for audit {audit_id}: {e}")
        else:
            print(f"[RAG Warning] HTML crawl file not found at: {html_path}")

        chunks = RagService.chunk_report_data(report, html_content)
        print(f"[RAG] Sliced report {audit_id} into {len(chunks)} chunks.")
        
        results = RagService._retrieve_from_documents(query, chunks, k)
        print(f"[RAG] Retrieved {len(results)} matches from report chunks for query: '{query}'")
        return results
