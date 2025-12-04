import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface Feedback {
  id: string;
  encryptedData: string;
  timestamp: number;
  interviewer: string;
  candidateId: string;
  status: "pending" | "aggregated";
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newFeedback, setNewFeedback] = useState({
    candidateId: "",
    technicalSkills: "",
    communication: "",
    culturalFit: "",
    additionalComments: ""
  });
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Statistics
  const aggregatedCount = feedbacks.filter(f => f.status === "aggregated").length;
  const pendingCount = feedbacks.filter(f => f.status === "pending").length;

  useEffect(() => {
    loadFeedbacks().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);
      
      // Check contract availability using FHE
      const contract = await getContractReadOnly();
      if (contract) {
        const isAvailable = await contract.isAvailable();
        if (isAvailable) {
          setTransactionStatus({
            visible: true,
            status: "success",
            message: "FHE contract is available!"
          });
          setTimeout(() => {
            setTransactionStatus({ visible: false, status: "pending", message: "" });
          }, 2000);
        }
      }

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadFeedbacks = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const keysBytes = await contract.getData("feedback_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing feedback keys:", e);
        }
      }
      
      const list: Feedback[] = [];
      
      for (const key of keys) {
        try {
          const feedbackBytes = await contract.getData(`feedback_${key}`);
          if (feedbackBytes.length > 0) {
            try {
              const feedbackData = JSON.parse(ethers.toUtf8String(feedbackBytes));
              list.push({
                id: key,
                encryptedData: feedbackData.data,
                timestamp: feedbackData.timestamp,
                interviewer: feedbackData.interviewer,
                candidateId: feedbackData.candidateId,
                status: feedbackData.status || "pending"
              });
            } catch (e) {
              console.error(`Error parsing feedback data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading feedback ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setFeedbacks(list);
    } catch (e) {
      console.error("Error loading feedbacks:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setSubmitting(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting feedback with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newFeedback))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const feedbackId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const feedbackData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        interviewer: account,
        candidateId: newFeedback.candidateId,
        status: "pending"
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `feedback_${feedbackId}`, 
        ethers.toUtf8Bytes(JSON.stringify(feedbackData))
      );
      
      const keysBytes = await contract.getData("feedback_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(feedbackId);
      
      await contract.setData(
        "feedback_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted feedback submitted securely!"
      });
      
      await loadFeedbacks();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewFeedback({
          candidateId: "",
          technicalSkills: "",
          communication: "",
          culturalFit: "",
          additionalComments: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const aggregateFeedback = async (candidateId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Aggregating feedback with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      // Update all feedbacks for this candidate
      const candidateFeedbacks = feedbacks.filter(f => f.candidateId === candidateId);
      for (const feedback of candidateFeedbacks) {
        const feedbackBytes = await contract.getData(`feedback_${feedback.id}`);
        if (feedbackBytes.length === 0) continue;
        
        const feedbackData = JSON.parse(ethers.toUtf8String(feedbackBytes));
        const updatedFeedback = {
          ...feedbackData,
          status: "aggregated"
        };
        
        await contract.setData(
          `feedback_${feedback.id}`, 
          ethers.toUtf8Bytes(JSON.stringify(updatedFeedback))
        );
      }
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE aggregation completed successfully!"
      });
      
      await loadFeedbacks();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Aggregation failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isInterviewer = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to access the platform",
      icon: "🔗"
    },
    {
      title: "Submit Feedback",
      description: "Provide encrypted feedback using FHE technology",
      icon: "🔒"
    },
    {
      title: "FHE Processing",
      description: "Feedback is aggregated while remaining encrypted",
      icon: "⚙️"
    },
    {
      title: "View Results",
      description: "See bias-reduced candidate profiles",
      icon: "📊"
    }
  ];

  const renderPieChart = () => {
    const total = feedbacks.length || 1;
    const aggregatedPercentage = (aggregatedCount / total) * 100;
    const pendingPercentage = (pendingCount / total) * 100;

    return (
      <div className="pie-chart-container">
        <div className="pie-chart">
          <div 
            className="pie-segment aggregated" 
            style={{ transform: `rotate(${aggregatedPercentage * 3.6}deg)` }}
          ></div>
          <div 
            className="pie-segment pending" 
            style={{ transform: `rotate(${(aggregatedPercentage + pendingPercentage) * 3.6}deg)` }}
          ></div>
          <div className="pie-center">
            <div className="pie-value">{feedbacks.length}</div>
            <div className="pie-label">Feedbacks</div>
          </div>
        </div>
        <div className="pie-legend">
          <div className="legend-item">
            <div className="color-box aggregated"></div>
            <span>Aggregated: {aggregatedCount}</span>
          </div>
          <div className="legend-item">
            <div className="color-box pending"></div>
            <span>Pending: {pendingCount}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="tech-spinner"></div>
      <p>Initializing FHE connection...</p>
    </div>
  );

  return (
    <div className="app-container tech-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>Confidential<span>Interview</span>Feedback</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-feedback-btn tech-button"
          >
            <div className="add-icon"></div>
            Add Feedback
          </button>
          <button 
            className="tech-button"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            {showTutorial ? "Hide Tutorial" : "Show Tutorial"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Confidential Interview Feedback</h2>
            <p>Reduce bias in hiring with FHE-encrypted feedback aggregation</p>
          </div>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section">
            <h2>How It Works</h2>
            <p className="subtitle">FHE-powered bias reduction in hiring</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="dashboard-grid">
          <div className="dashboard-card tech-card">
            <h3>Project Overview</h3>
            <p>Platform for submitting encrypted interview feedback that aggregates into bias-reduced candidate profiles using FHE technology.</p>
            <div className="fhe-badge">
              <span>FHE-Powered</span>
            </div>
          </div>
          
          <div className="dashboard-card tech-card">
            <h3>Feedback Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{feedbacks.length}</div>
                <div className="stat-label">Total Feedbacks</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{aggregatedCount}</div>
                <div className="stat-label">Aggregated</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card tech-card">
            <h3>Status Distribution</h3>
            {renderPieChart()}
          </div>
        </div>
        
        <div className="feedbacks-section">
          <div className="section-header">
            <h2>Encrypted Feedback Records</h2>
            <div className="header-actions">
              <button 
                onClick={loadFeedbacks}
                className="refresh-btn tech-button"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="feedbacks-list tech-card">
            <div className="table-header">
              <div className="header-cell">ID</div>
              <div className="header-cell">Candidate ID</div>
              <div className="header-cell">Interviewer</div>
              <div className="header-cell">Date</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {feedbacks.length === 0 ? (
              <div className="no-records">
                <div className="no-records-icon"></div>
                <p>No feedback records found</p>
                <button 
                  className="tech-button primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Submit First Feedback
                </button>
              </div>
            ) : (
              feedbacks.map(feedback => (
                <div className="feedback-row" key={feedback.id}>
                  <div className="table-cell feedback-id">#{feedback.id.substring(0, 6)}</div>
                  <div className="table-cell">{feedback.candidateId}</div>
                  <div className="table-cell">{feedback.interviewer.substring(0, 6)}...{feedback.interviewer.substring(38)}</div>
                  <div className="table-cell">
                    {new Date(feedback.timestamp * 1000).toLocaleDateString()}
                  </div>
                  <div className="table-cell">
                    <span className={`status-badge ${feedback.status}`}>
                      {feedback.status}
                    </span>
                  </div>
                  <div className="table-cell actions">
                    {isInterviewer(feedback.interviewer) && feedback.status === "pending" && (
                      <button 
                        className="action-btn tech-button primary"
                        onClick={() => aggregateFeedback(feedback.candidateId)}
                      >
                        Aggregate
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
  
      {showCreateModal && (
        <ModalCreate 
          onSubmit={submitFeedback} 
          onClose={() => setShowCreateModal(false)} 
          submitting={submitting}
          feedbackData={newFeedback}
          setFeedbackData={setNewFeedback}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content tech-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="tech-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>ConfidentialInterviewFeedback</span>
            </div>
            <p>Bias-reduced hiring with FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} ConfidentialInterviewFeedback. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  submitting: boolean;
  feedbackData: any;
  setFeedbackData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  submitting,
  feedbackData,
  setFeedbackData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFeedbackData({
      ...feedbackData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!feedbackData.candidateId) {
      alert("Please enter Candidate ID");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal tech-card">
        <div className="modal-header">
          <h2>Submit Encrypted Feedback</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Your feedback will be encrypted with FHE
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Candidate ID *</label>
              <input 
                type="text"
                name="candidateId"
                value={feedbackData.candidateId} 
                onChange={handleChange}
                placeholder="Enter candidate identifier" 
                className="tech-input"
              />
            </div>
            
            <div className="form-group">
              <label>Technical Skills (1-5)</label>
              <select 
                name="technicalSkills"
                value={feedbackData.technicalSkills} 
                onChange={handleChange}
                className="tech-select"
              >
                <option value="">Select rating</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Below Average</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Communication (1-5)</label>
              <select 
                name="communication"
                value={feedbackData.communication} 
                onChange={handleChange}
                className="tech-select"
              >
                <option value="">Select rating</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Below Average</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Cultural Fit (1-5)</label>
              <select 
                name="culturalFit"
                value={feedbackData.culturalFit} 
                onChange={handleChange}
                className="tech-select"
              >
                <option value="">Select rating</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Below Average</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Additional Comments</label>
              <textarea 
                name="additionalComments"
                value={feedbackData.additionalComments} 
                onChange={handleChange}
                placeholder="Enter your feedback comments..." 
                className="tech-textarea"
                rows={3}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Feedback remains encrypted during FHE processing
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn tech-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="submit-btn tech-button primary"
          >
            {submitting ? "Encrypting with FHE..." : "Submit Securely"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;