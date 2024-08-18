local logName = 'DCS.JS.CAS'
local function debugLog(message) log.write(logName, log.INFO, tostring(message)) end

local function printObj(obj, hierarchyLevel) 
    if (hierarchyLevel == nil) then
        hierarchyLevel = 0
    elseif (hierarchyLevel == 4) then
        return 0
    end
    
    local whitespace = ""
    for i=0,hierarchyLevel,1 do
        whitespace = whitespace .. "-"
    end
    
    debugLog(obj)
    if (type(obj) == "table") then
        for k,v in pairs(obj) do
        io.write(whitespace .. "-")
        if (type(v) == "table") then
            printObj(v, hierarchyLevel+1)
        else
            debugLog(v)
        end           
        end
    else
        debugLog(obj)
    end
end

DCAS = {}
CASTargets = {}

local smokeColor = 4
local targetUnitMenuName = "%s: %s"
local startLasingMenuName = "Start Lasing Target"
local stopLasingMenuName = "Stop Laser"
local laserCode = 1337

local function getTargetUnits(groupName, targetGroupName)
    local units = {}

    local targetGroup = Group.getByName(targetGroupName)
    if targetGroup then
        local targetUnits = targetGroup:getUnits()

        for i in pairs(targetUnits) do
            local unit = targetUnits[i]

            if unit == nil then
                debugLog("unit is nil")
                return
            end

            units[#units + 1] = unit
            DCAS.targets[unit:getName()] = groupName
        end

        local targetAAGroup = Group.getByName(targetGroupName .. "|AA")
        if targetAAGroup then
            local targetAAUnits = targetAAGroup:getUnits()

            for i in pairs(targetAAUnits) do
                local unit = targetAAUnits[i]

                if unit == nil then
                    debugLog("unit is nil")
                    return
                end

                units[#units + 1] = unit
                DCAS.targets[unit:getName()] = groupName
            end
        end
    end

    return units
end

function DCAS:New(groupId, groupName, jtacName, targetGroupName)
    local groupConfig = {}
    groupConfig.groupId = groupId
    groupConfig.groupName = groupName
    groupConfig.jtacName = jtacName
    groupConfig.targetGroupName = targetGroupName
    groupConfig.laserCode = laserCode

    laserCode = laserCode + 1
    

    DCAS[groupName] = groupConfig
    DCAS.targets = {}

    --local aaTargetGroupName = targetGroupName .. "|AA"
    --DCAS.targets[targetGroupName] = groupName
    --DCAS.targets[aaTargetGroupName] = groupName
    
    return self
end


function DCAS.CreateMenu(groupName)
    debugLog("Create Menu for " .. groupName)
    local groupConfig = DCAS[groupName]
    
    if groupConfig then
            
        missionCommands.removeItemForGroup(groupConfig.groupId, "CAS")

        local flightGroupUnitNames = Utils.getFlightGroupUnitNames(groupConfig)

        local targetUnits = getTargetUnits(groupName, groupConfig.targetGroupName)

        missionCommands.addSubMenuForGroup(groupConfig.groupId, "CAS")

        if #targetUnits > 0 then
            for i in pairs(targetUnits) do
                local unit = targetUnits[i]

                if unit ~= nil then
                    if unit:getLife() >= 1 then
                        local unitPath = missionCommands.addSubMenuForGroup(groupConfig.groupId, string.format(targetUnitMenuName, i, unit:getTypeName()), {"CAS"})

                        missionCommands.addCommandForGroup(groupConfig.groupId, "Request Smoke", unitPath, DCAS.SmokeUnit, unit, flightGroupUnitNames)
                        missionCommands.addCommandForGroup(groupConfig.groupId, "Get LL Coordinates", unitPath, DCAS.GetUnitLL, unit, flightGroupUnitNames, false)
                        missionCommands.addCommandForGroup(groupConfig.groupId, "Get LL DMS Coordinates", unitPath, DCAS.GetUnitLL, unit, flightGroupUnitNames, true)
                        missionCommands.addCommandForGroup(groupConfig.groupId, startLasingMenuName, unitPath, DCAS.LaseTarget, groupName, unit, flightGroupUnitNames)
                    else
                        debugLog("units life is below 1: " .. unit:getName())
                    end
                end
                
            end
        else
            missionCommands.addCommandForGroup(groupConfig.groupId, "All targets are destroyed", {"CAS"}, DCAS.NoTarget)
        end
    else
        debugLog("groupConfig for " .. groupName .. " not found")
    end

end

function DCAS.NoTarget()
end

function DCAS.SmokeUnit(unit, flightGroupUnitNames)
    Utils.sendMessageToUnits("Copy. Start Smoking " .. unit:getTypeName() .. " position", flightGroupUnitNames)

    trigger.action.smoke(unit:getPoint(), smokeColor)
end

function DCAS.GetUnitLL(unit, flightGroupUnitNames, dms)
    local unitTable = {}

    if unit == nil then
        debugLog("unit is nil")
        return
    end

    table.insert(unitTable, unit:getName())

    local str = mist.getLLString({units = unitTable, acc = 3, DMS = dms})

    Utils.sendMessageToUnits(str, flightGroupUnitNames, 30)

    local altitude = Utils.getPointAltitude(unit:getPoint())

    Utils.sendMessageToUnits("Altitude: " .. tostring(altitude) .. "ft", flightGroupUnitNames, 30)
end

function DCAS.LaseTarget(groupName, targetUnit, flightGroupUnitNames)
    local groupConfig = DCAS[groupName]

    if groupConfig then
        local jtac = Unit.getByName(groupConfig.jtacName)
        local target = targetUnit:getPoint()

        if jtac then
            if groupConfig.laser then
                groupConfig.laser:destory()
            end
           
            groupConfig.laser = Spot.createLaser(jtac, nil, target, groupConfig.laserCode)

            Utils.sendMessageToUnits(string.format("Copy. Start Lasing %s with Code %s", targetUnit:getTypeName(), tostring(groupConfig.laserCode)), flightGroupUnitNames, 10)

            if targetUnit == nil then
                debugLog("targetUnit is nil")
                return
            end

            local unitIndex = DCAS.getTargetUnitIndex(groupConfig.targetGroupName, targetUnit:getName())

            

            local startLasingPath = {}
            startLasingPath[#startLasingPath + 1] = "CAS"
            startLasingPath[#startLasingPath + 1] = string.format(targetUnitMenuName, unitIndex, targetUnit:getTypeName())
            startLasingPath[#startLasingPath + 1] = startLasingMenuName

            missionCommands.removeItemForGroup(groupConfig.groupId, startLasingPath)

            local unitPath = {}
            unitPath[#unitPath + 1] = "CAS"
            unitPath[#unitPath + 1] = string.format(targetUnitMenuName, unitIndex, targetUnit:getTypeName())
            
            missionCommands.addCommandForGroup(groupConfig.groupId, stopLasingMenuName, unitPath, DCAS.StopLaser, groupName, targetUnit, flightGroupUnitNames)
        else
            debugLog("LaseTarget: jtac not found " .. groupConfig.jtacName)
        end
    else
        debugLog("LaseTarget: groupConfig not set")
    end
end

function DCAS.StopLaser(groupName, targetUnit, flightGroupUnitNames)
    local groupConfig = DCAS[groupName]
    
    if targetUnit == nil then
        debugLog("targetUnit is nil")
        return
    end

    local unitIndex = DCAS.getTargetUnitIndex(groupConfig.targetGroupName, targetUnit:getName())

    local unitPath = groupConfig.menuRootPath
    unitPath[#unitPath + 1] = string.format(targetUnitMenuName, unitIndex, targetUnit:getTypeName())
    unitPath[#unitPath + 1] = stopLasingMenuName

    missionCommands.removeItemForGroup(groupConfig.groupId, unitPath)

    Utils.sendMessageToUnits("Laser stopped", flightGroupUnitNames)
end

function DCAS.onUnitDead(groupName, unitName)
    local groupConfig = DCAS[groupName]

    if groupConfig then
        local flightGroupUnitNames = Utils.getFlightGroupUnitNames(groupConfig)

        Utils.sendMessageToUnits(string.format("Target %s destroyed", unitName), flightGroupUnitNames)

        if groupConfig.laser then
            groupConfig.laser.destroy()


        end

        local unitIndex = DCAS.getTargetUnitIndex(groupConfig.targetGroupName, unitName)
        local unit = Unit.getByName(unitName)

        local unitPath = groupConfig.menuRootPath
        unitPath[#unitPath + 1] = string.format(targetUnitMenuName, unitIndex, unit:getTypeName())

        missionCommands.removeItemForGroup(groupConfig.groupId, unitPath)
    end
end

function DCAS.getTargetUnitIndex(targetGroupName, unitName)
    local targetGroup = Group.getByName(targetGroupName)
    local targetUnits = targetGroup:getUnits()
    local index = -1

    for i in pairs(targetUnits) do
        local unit = targetUnits[i]

        if unit == nil then
            debugLog("unit is nil")
            return
        end

        if unit:getName() == unitName then
            index = i
        end
    end

    return index
end

DCAS.eventHandler = {}
function DCAS:onEvent(event)
    if event.id == world.event.S_EVENT_BIRTH and event.initiator then

        if event.initiator == nil then
            debugLog("event.initiator is nil")
            return
        end

        local name = event.initiator:getName()
        local unit = Unit.getByName(name)

        if unit then
            local group = unit:getGroup()
            if group then
                local groupName = group:getName()

                local groupConfig = DCAS[groupName]

                if groupConfig then
                    DCAS.CreateMenu(groupConfig.groupName)
                end
            end
        end
    end
    if event.id == world.event.S_EVENT_DEAD and event.initiator then
        if event.initiator == nil then
            debugLog("event.initiator is nil")
            return
        end

        local name = event.initiator:getName()
        debugLog("S_EVENT_DEAD event for " .. name)

        local targetConfig = DCAS.targets[name]
                
        if targetConfig then
            debugLog(name .. " is a CAS target for " .. targetConfig)
            DCAS.CreateMenu(targetConfig) 
        else
            debugLog(name .. " is a NOT a CAS target .. length: " .. tostring(#DCAS.targets))
        end
    end
end

function DCAS.Start()
    world.addEventHandler(DCAS)
end

