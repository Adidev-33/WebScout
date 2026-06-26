# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

from pydantic import BaseModel, Field
from typing import List, Optional

class AuditScores(BaseModel):
    overall: float = Field(..., description="Overall score out of 10")
    seo: float = Field(..., description="SEO health score out of 10")
    performance: float = Field(..., description="Performance health score out of 10")
    technical: float = Field(..., description="Technical/Accessibility health score out of 10")

class HeadingStructure(BaseModel):
    h1Count: int = Field(default=0)
    h2Count: int = Field(default=0)
    h3Count: int = Field(default=0)

class BrokenLinkDetails(BaseModel):
    url: str = Field(..., description="The broken hyperlink destination URL")
    statusCode: int = Field(..., description="The HTTP response code or 0 if connection error")
    errorDescription: str = Field(..., description="The description of the error code or connection error")

class MetaDataAnalysisDetails(BaseModel):
    titleLength: int = Field(default=0, description="Length of the page title")
    titleStatus: str = Field(default="Missing", description="Status of the title (Optimal, Too Short, Too Long, Missing)")
    titleRecommendations: List[str] = Field(default_factory=list, description="Recommendations for the title")
    metaDescriptionLength: int = Field(default=0, description="Length of the meta description")
    metaDescriptionStatus: str = Field(default="Missing", description="Status of the meta description")
    metaDescriptionRecommendations: List[str] = Field(default_factory=list, description="Recommendations for the meta description")
    openGraphCount: int = Field(default=0, description="Number of Open Graph tags found")
    twitterCardCount: int = Field(default=0, description="Number of Twitter Card tags found")

class AuditMetrics(BaseModel):
    loadTimeMs: float = Field(..., description="Page load speed in milliseconds")
    responseCode: int = Field(..., description="HTTP status response code")
    sslActive: bool = Field(..., description="True if URL uses HTTPS")
    consoleErrorsSimulated: List[str] = Field(default_factory=list, description="Browser console warnings or errors")
    totalImages: int = Field(default=0)
    imagesMissingAlt: int = Field(default=0)
    hasTitle: bool = Field(default=False)
    hasMetaDescription: bool = Field(default=False)
    hasViewport: bool = Field(default=False)
    headingStructure: HeadingStructure
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    brokenLinksCount: int = Field(default=0, description="Number of broken links found")
    brokenLinks: List[BrokenLinkDetails] = Field(default_factory=list, description="Details of broken links")
    metaDataAnalysis: Optional[MetaDataAnalysisDetails] = None

class ExecutiveSummary(BaseModel):
    theGood: List[str] = Field(default_factory=list, description="List of positive website features")
    criticalFlaws: List[str] = Field(default_factory=list, description="List of severe flaws or layout issues")
    roadmap: List[str] = Field(default_factory=list, description="Step-by-step developer recommendations")
    rawMarkdown: str = Field(..., description="A complete, beautiful markdown formatted audit overview")

class RedirectStep(BaseModel):
    url: str
    statusCode: int
    redirectType: str
    errorDescription: Optional[str] = None

class AuditReport(BaseModel):
    id: str
    url: str
    timestamp: str
    status: str = Field(default="pending", description="One of 'pending', 'processing', 'completed', 'failed'")
    progress: str = Field(default="Starting pipeline...", description="Human readable stage status description")
    error: Optional[str] = None
    scores: Optional[AuditScores] = None
    metrics: Optional[AuditMetrics] = None
    summary: Optional[ExecutiveSummary] = None
    screenshotPath: Optional[str] = Field(default=None, description="Relative path to the captured full-page screenshot PNG")
    redirectChain: List[RedirectStep] = Field(default_factory=list)
    previousAuditId: Optional[str] = Field(default=None, description="ID of the previous audit of the same website")

class RedirectAuditResult(BaseModel):
    inputUrl: str
    chain: List[RedirectStep]
    finalUrl: Optional[str] = None
    hasLoop: bool
    status: str
    error: Optional[str] = None

class RedirectBatchResponse(BaseModel):
    results: List[RedirectAuditResult]

class ScoreDelta(BaseModel):
    overall: float
    seo: float
    performance: float
    technical: float

class MetricDelta(BaseModel):
    loadTimeMs: float
    totalImages: int
    imagesMissingAlt: int
    brokenLinksCount: int

class ChangeItem(BaseModel):
    item: str
    status: str
    description: str

class AuditComparisonResponse(BaseModel):
    auditA: AuditReport
    auditB: AuditReport
    scoreDelta: ScoreDelta
    metricDelta: MetricDelta
    changes: List[ChangeItem]

class MappedPathPair(BaseModel):
    path: str
    auditA: Optional[AuditReport] = None
    auditB: Optional[AuditReport] = None
    scoreDelta: Optional[float] = None

class URLMappingResponse(BaseModel):
    prefixA: str
    prefixB: str
    pairs: List[MappedPathPair]
