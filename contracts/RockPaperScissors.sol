// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RockPaperScissors
 * @author 호서대 디지털기술경영학과 프로젝트
 * @notice 커밋-리빌 패턴 기반 가위바위보 dApp
 *         - 무료 플레이 (참가비 없음)
 *         - 월간 최다 승자에게 owner가 직접 ETH 지급
 *         - Sepolia 테스트넷 → L2(Base/Arbitrum) 배포 예정
 */
contract RockPaperScissors {

    // =========================================================
    //  State Variables
    // =========================================================

    address public owner;
    uint256 public constant TIMEOUT = 5 minutes; // 타임아웃 기준

    // =========================================================
    //  Enums
    // =========================================================

    enum Choice { None, Rock, Paper, Scissors }
    //            0      1     2      3
    // 주의: None(0)은 미선택 상태 — reveal 시 None이면 무효 처리

    enum GameState { Idle, Committing, Revealing, Finished }
    //               0      1            2           3

    enum Result { None, Player1Win, Player2Win, Draw }

    // =========================================================
    //  Structs
    // =========================================================

    struct Player {
        address addr;
        bytes32 commitment;   // keccak256(abi.encodePacked(choice, salt))
        Choice  choice;       // reveal 후 공개
        bool    hasCommitted;
        bool    hasRevealed;
    }

    struct Game {
        Player    player1;
        Player    player2;
        uint256   commitDeadline;   // 이 시간 안에 양쪽 commit 완료해야 함
        uint256   revealDeadline;   // 이 시간 안에 양쪽 reveal 완료해야 함
        GameState state;
        Result    result;
    }

    // 플레이어별 통계 (오프체인에서 읽어서 월간 우승자 결정)
    struct Stats {
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 totalGames;
    }

    // =========================================================
    //  Storage
    // =========================================================

    Game public currentGame;
    mapping(address => Stats) public playerStats;

    // =========================================================
    //  Events
    // =========================================================

    event GameStarted(address indexed player1, address indexed player2, uint256 commitDeadline);
    event PlayerCommitted(address indexed player);
    event BothCommitted(uint256 revealDeadline);
    event PlayerRevealed(address indexed player, Choice choice);
    event GameFinished(Result result, address indexed winner);
    event GameForceReset(address indexed caller, string reason);
    event PrizePaid(address indexed winner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // =========================================================
    //  Modifier
    // =========================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "onlyOwner: caller is not the owner");
        _;
    }

    modifier gameActive() {
        require(
            currentGame.state == GameState.Committing || currentGame.state == GameState.Revealing,
            "No active game"
        );
        _;
    }

    // =========================================================
    //  Constructor
    // =========================================================

    constructor() {
        owner = msg.sender;
    }

    // =========================================================
    //  Public / External — 게임 로직
    // =========================================================

    /**
     * @notice 커밋용 해시 계산 헬퍼
     * @dev    프론트엔드에서 이 함수로 해시를 만들어서 commit()에 넘기면 됨
     * @param  _choice  선택 (1=Rock, 2=Paper, 3=Scissors)
     * @param  _salt    랜덤 bytes32 (ethers.js: ethers.randomBytes(32))
     */
    function getHash(Choice _choice, bytes32 _salt) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_choice, _salt));
    }

    /**
     * @notice 새 게임 시작 (player1이 호출)
     * @param  _player2  상대방 주소
     */
    function startGame(address _player2) external {
        require(currentGame.state == GameState.Idle || currentGame.state == GameState.Finished,
            "Game already in progress");
        require(_player2 != msg.sender, "Can't play against yourself");
        require(_player2 != address(0), "Invalid player2 address");

        // 게임 초기화
        delete currentGame; // 이전 게임 데이터 전부 클리어

        currentGame.player1.addr   = msg.sender;
        currentGame.player2.addr   = _player2;
        currentGame.commitDeadline = block.timestamp + TIMEOUT;
        currentGame.state          = GameState.Committing;

        emit GameStarted(msg.sender, _player2, currentGame.commitDeadline);
    }

    /**
     * @notice 커밋 단계 — 해시만 제출 (선택지 비공개)
     * @param  _commitment  getHash(choice, salt)로 얻은 값
     */
    function commit(bytes32 _commitment) external {
        require(currentGame.state == GameState.Committing, "Not in commit phase");
        require(block.timestamp <= currentGame.commitDeadline, "Commit deadline passed");

        if (msg.sender == currentGame.player1.addr) {
            require(!currentGame.player1.hasCommitted, "Player1 already committed");
            currentGame.player1.commitment  = _commitment;
            currentGame.player1.hasCommitted = true;

        } else if (msg.sender == currentGame.player2.addr) {
            require(!currentGame.player2.hasCommitted, "Player2 already committed");
            currentGame.player2.commitment  = _commitment;
            currentGame.player2.hasCommitted = true;

        } else {
            revert("You are not a player in this game");
        }

        emit PlayerCommitted(msg.sender);

        // 둘 다 커밋하면 리빌 단계로 전환
        if (currentGame.player1.hasCommitted && currentGame.player2.hasCommitted) {
            currentGame.revealDeadline = block.timestamp + TIMEOUT;
            currentGame.state          = GameState.Revealing;
            emit BothCommitted(currentGame.revealDeadline);
        }
    }

    /**
     * @notice 리빌 단계 — 실제 선택지와 salt를 공개해서 커밋 검증
     * @param  _choice  처음 선택한 값 (1/2/3)
     * @param  _salt    커밋할 때 사용한 동일한 salt
     */
    function reveal(Choice _choice, bytes32 _salt) external {
        require(currentGame.state == GameState.Revealing, "Not in reveal phase");
        require(block.timestamp <= currentGame.revealDeadline, "Reveal deadline passed");
        require(_choice != Choice.None, "Choice cannot be None");

        if (msg.sender == currentGame.player1.addr) {
            require(!currentGame.player1.hasRevealed, "Player1 already revealed");
            require(
                getHash(_choice, _salt) == currentGame.player1.commitment,
                "Hash mismatch: wrong choice or salt"
            );
            currentGame.player1.choice     = _choice;
            currentGame.player1.hasRevealed = true;

        } else if (msg.sender == currentGame.player2.addr) {
            require(!currentGame.player2.hasRevealed, "Player2 already revealed");
            require(
                getHash(_choice, _salt) == currentGame.player2.commitment,
                "Hash mismatch: wrong choice or salt"
            );
            currentGame.player2.choice     = _choice;
            currentGame.player2.hasRevealed = true;

        } else {
            revert("You are not a player in this game");
        }

        emit PlayerRevealed(msg.sender, _choice);

        // 둘 다 리빌하면 승패 판정
        if (currentGame.player1.hasRevealed && currentGame.player2.hasRevealed) {
            _determineWinner();
        }
    }

    /**
     * @notice 타임아웃 강제 리셋 — 누구나 호출 가능
     *         커밋 기한 초과(한 명만 커밋) 또는 리빌 기한 초과 시 사용
     */
    function forceReset() external gameActive {
        bool commitExpired = (currentGame.state == GameState.Committing) &&
                             (block.timestamp > currentGame.commitDeadline);

        bool revealExpired = (currentGame.state == GameState.Revealing) &&
                             (block.timestamp > currentGame.revealDeadline);

        require(commitExpired || revealExpired, "Game has not expired yet");

        string memory reason = commitExpired ? "Commit timeout" : "Reveal timeout";
        currentGame.state = GameState.Finished;

        emit GameForceReset(msg.sender, reason);
    }

    // =========================================================
    //  Internal — 승패 판정 & 리셋
    // =========================================================

    function _determineWinner() internal {
        Choice c1 = currentGame.player1.choice;
        Choice c2 = currentGame.player2.choice;

        Result result;

        if (c1 == c2) {
            result = Result.Draw;
        } else if (
            (c1 == Choice.Rock     && c2 == Choice.Scissors) ||
            (c1 == Choice.Scissors && c2 == Choice.Paper)    ||
            (c1 == Choice.Paper    && c2 == Choice.Rock)
        ) {
            result = Result.Player1Win;
        } else {
            result = Result.Player2Win;
        }

        currentGame.result = result;
        currentGame.state  = GameState.Finished;

        // 통계 업데이트
        address p1 = currentGame.player1.addr;
        address p2 = currentGame.player2.addr;

        playerStats[p1].totalGames++;
        playerStats[p2].totalGames++;

        if (result == Result.Player1Win) {
            playerStats[p1].wins++;
            playerStats[p2].losses++;
            emit GameFinished(result, p1);

        } else if (result == Result.Player2Win) {
            playerStats[p2].wins++;
            playerStats[p1].losses++;
            emit GameFinished(result, p2);

        } else {
            playerStats[p1].draws++;
            playerStats[p2].draws++;
            emit GameFinished(result, address(0)); // address(0) = 무승부
        }
    }

    // =========================================================
    //  Owner 전용 — 상금 관리
    // =========================================================

    /**
     * @notice ETH 입금 (상금 풀 충전용)
     */
    receive() external payable {}

    /**
     * @notice 컨트랙트 잔액 조회
     */
    function getBalance() external view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice 비상 전액 출금 — 컨트랙트에 ETH가 묶였을 때 owner가 전액 회수
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "Nothing to withdraw");
        emit PrizePaid(owner, bal);
        (bool success, ) = payable(owner).call{value: bal}("");
        require(success, "Withdraw failed");
    }

    /**
     * @notice Owner 이전 — 지갑 키 노출 등 비상 상황에서 owner 교체
     * @param  _newOwner  새 owner 주소
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /**
     * @notice 월간 우승자에게 ETH 지급
     * @dev    오프체인(프론트/스크립트)에서 playerStats 읽어 최다 승자 확인 후 호출
     * @param  _winner  수령인 주소
     * @param  _amount  지급액 (wei 단위)
     */
    function payout(address payable _winner, uint256 _amount) external onlyOwner {
        require(_winner != address(0), "Invalid winner address");
        require(_amount > 0, "Amount must be > 0");
        require(_amount <= address(this).balance, "Insufficient contract balance");

        // ✅ CEI 패턴: 상태 변경(emit)을 외부 호출(.call) 이전에
        emit PrizePaid(_winner, _amount);
        (bool success, ) = _winner.call{value: _amount}("");
        require(success, "ETH transfer failed");
    }

    // =========================================================
    //  View — 외부 조회용
    // =========================================================

    /**
     * @notice 특정 플레이어 통계 조회
     */
    function getStats(address _player)
        external
        view
        returns (uint256 wins, uint256 losses, uint256 draws, uint256 totalGames)
    {
        Stats memory s = playerStats[_player];
        return (s.wins, s.losses, s.draws, s.totalGames);
    }

    /**
     * @notice 현재 게임 상태 요약
     */
    function getGameState()
        external
        view
        returns (
            address player1,
            address player2,
            GameState state,
            bool p1Committed,
            bool p2Committed,
            bool p1Revealed,
            bool p2Revealed,
            Result result
        )
    {
        return (
            currentGame.player1.addr,
            currentGame.player2.addr,
            currentGame.state,
            currentGame.player1.hasCommitted,
            currentGame.player2.hasCommitted,
            currentGame.player1.hasRevealed,
            currentGame.player2.hasRevealed,
            currentGame.result
        );
    }
}
