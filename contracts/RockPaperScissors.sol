// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RockPaperScissors {
    address public owner;

    enum Choice { NONE, ROCK, PAPER, SCISSORS }
    enum Result { NONE, WIN, LOSE, DRAW }

    struct GameRecord {
        bytes32 commitment;
        bool hasCommitted;
        uint256 commitTime;
    }

    struct Stats {
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 totalGames;
    }

    uint256 public constant TIMEOUT = 1 hours;

    mapping(address => GameRecord) public pendingGames;
    mapping(address => Stats) public playerStats;

    event Committed(address indexed player);
    event GameResult(
        address indexed player,
        Choice playerChoice,
        Choice systemChoice,
        Result result
    );
    event PrizePaid(address indexed winner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // 1) 커밋: 해시만 제출
    function commit(bytes32 _commitment) external {
        require(!pendingGames[msg.sender].hasCommitted, "Already committed");
        pendingGames[msg.sender] = GameRecord({
            commitment: _commitment,
            hasCommitted: true,
            commitTime: block.timestamp
        });
        emit Committed(msg.sender);
    }

    // 2) 리빌: 실제 무브 + salt 공개 → 결과 확정
    function reveal(Choice _choice, bytes32 _salt) external {
        GameRecord storage game = pendingGames[msg.sender];
        require(game.hasCommitted, "Not committed");
        require(_choice != Choice.NONE, "Invalid choice");
        require(
            keccak256(abi.encodePacked(_choice, _salt)) == game.commitment,
            "Hash mismatch"
        );

        // 시스템 무브: 블록 랜덤값 사용
        Choice systemChoice = Choice(
            uint256(keccak256(abi.encodePacked(
                block.prevrandao,
                block.timestamp,
                msg.sender
            ))) % 3 + 1
        );

        // CEI 패턴: 상태 먼저 변경
        Result result = _determineResult(_choice, systemChoice);

        Stats storage stats = playerStats[msg.sender];
        stats.totalGames++;
        if (result == Result.WIN) stats.wins++;
        else if (result == Result.LOSE) stats.losses++;
        else stats.draws++;

        delete pendingGames[msg.sender];

        emit GameResult(msg.sender, _choice, systemChoice, result);
    }

    function _determineResult(Choice player, Choice system) internal pure returns (Result) {
        if (player == system) return Result.DRAW;
        if (
            (player == Choice.ROCK     && system == Choice.SCISSORS) ||
            (player == Choice.SCISSORS && system == Choice.PAPER)    ||
            (player == Choice.PAPER    && system == Choice.ROCK)
        ) return Result.WIN;
        return Result.LOSE;
    }

    // 통계 조회
    function getStats(address _player) external view returns (
        uint256 wins, uint256 losses, uint256 draws, uint256 totalGames
    ) {
        Stats memory s = playerStats[_player];
        return (s.wins, s.losses, s.draws, s.totalGames);
    }

    // 해시 계산 헬퍼 (프론트에서도 쓰지만 검증용으로)
    function getHash(Choice _choice, bytes32 _salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_choice, _salt));
    }

    // 만료된 게임 직접 취소
    function cancelExpired() external {
        GameRecord storage game = pendingGames[msg.sender];
        require(game.hasCommitted, "No pending game");
        require(block.timestamp > game.commitTime + TIMEOUT, "Not expired");
        delete pendingGames[msg.sender];
    }

    // owner 전용: 월간 우승자에게 상금 지급
    function payout(address payable _winner, uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = _winner.call{value: _amount}("");
        require(success, "Transfer failed");
        emit PrizePaid(_winner, _amount);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    receive() external payable {}
}